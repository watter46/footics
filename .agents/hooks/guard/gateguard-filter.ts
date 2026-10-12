import * as fs from 'fs';
import * as path from 'path';

function checkGateguard(payload: any): any {
  const toolCall = payload.toolCall;
  if (!toolCall || !toolCall.args) return { decision: 'allow' };

  const rawTargetFile = toolCall.args.TargetFile;
  if (!rawTargetFile) return { decision: 'allow' };

  if (toolCall.name === 'write_to_file' && toolCall.args.Overwrite !== true) {
    return { decision: 'allow' };
  }

  const targetFile = path.resolve(rawTargetFile);
  const targetBasename = path.basename(targetFile);

  try {
    if (payload.transcriptPath && fs.existsSync(payload.transcriptPath)) {
      const transcript = fs.readFileSync(payload.transcriptPath, 'utf8');
      const lines = transcript.trim().split('\n');

      let viewed = false;
      const startIndex = Math.max(0, lines.length - 200);

      for (let i = lines.length - 1; i >= startIndex; i--) {
        if (!lines[i]) continue;
        try {
          const step = JSON.parse(lines[i]);
          if (step.tool_calls) {
            for (const tc of step.tool_calls) {
              if (
                tc.name === 'view_file' ||
                tc.name === 'run_command' ||
                tc.name === 'rtk'
              ) {
                const tcArgs = tc.args || {};
                const viewedPath = tcArgs.AbsolutePath || tcArgs.TargetFile || '';
                if (viewedPath && path.resolve(viewedPath) === targetFile) {
                  viewed = true;
                  break;
                }
                const tcStr = JSON.stringify(tc);
                if (
                  tcStr.includes(targetFile) ||
                  tcStr.includes(targetBasename)
                ) {
                  if (
                    tc.name === 'run_command' &&
                    /rtk read\s+(-m|--level)/.test(tcStr)
                  ) {
                    continue;
                  }
                  viewed = true;
                  break;
                }
              }
            }
          }
          if (viewed) break;
        } catch (_e) {}
      }

      if (!viewed) {
        return {
          decision: 'deny',
          reason: `[GATEGUARD] Blocked: You must read the file or its content first before modifying it. Use 'view_file' or uncompressed 'rtk read' on '${rawTargetFile}' to prevent blind edits.`,
        };
      }
    }
  } catch (_e) {}

  return { decision: 'allow' };
}

export { checkGateguard };
