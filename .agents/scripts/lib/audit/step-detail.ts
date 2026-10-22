import * as fs from 'node:fs';
import * as path from 'node:path';
import { brainDir, type TranscriptRecord } from '../../audit-session';

export function resolveFullTranscript(arg: string | undefined): string | null {
  const base = brainDir();
  const relFull = '.system_generated/logs/transcript_full.jsonl';
  const relCompact = '.system_generated/logs/transcript.jsonl';

  if (arg && arg !== 'latest') {
    const fullPath = path.join(base, arg, relFull);
    if (fs.existsSync(fullPath)) return fullPath;
    const compactPath = path.join(base, arg, relCompact);
    return fs.existsSync(compactPath) ? compactPath : null;
  }

  if (!fs.existsSync(base)) return null;
  const candidates = fs
    .readdirSync(base)
    .map((d) => {
      const fp = path.join(base, d, relFull);
      const cp = path.join(base, d, relCompact);
      const p = fs.existsSync(fp) ? fp : fs.existsSync(cp) ? cp : null;
      return p ? { p, m: fs.statSync(p).mtimeMs } : null;
    })
    .filter((x): x is { p: string; m: number } => x !== null)
    .sort((a, b) => b.m - a.m);

  return candidates[0]?.p ?? null;
}

function truncateWithOmission(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const excess = text.length - limit;
  return `${text.slice(0, limit)}…(+${excess} chars)`;
}

export function renderStepDetail(
  records: TranscriptRecord[],
  range: { start: number; end: number },
): string {
  const matching = records.filter(
    (r) => r.step_index >= range.start && r.step_index <= range.end,
  );

  if (matching.length === 0) {
    return `(No records in range ${range.start}:${range.end})`;
  }

  const clamped = matching.length > 10;
  const targetRecords = clamped ? matching.slice(0, 10) : matching;

  const lines: string[] = [];
  for (const r of targetRecords) {
    lines.push(
      `=== Step ${r.step_index} [${r.type}] status=${r.status ?? 'N/A'} at=${r.created_at ?? 'N/A'} ===`,
    );

    if (r.thinking) {
      lines.push('[Thinking]');
      lines.push(truncateWithOmission(r.thinking, 400));
    }

    if (r.tool_calls && r.tool_calls.length > 0) {
      lines.push('[Tool Calls]');
      for (const tc of r.tool_calls) {
        const rawArgs = JSON.stringify(tc.args, null, 2);
        lines.push(`- Tool: ${tc.name}`);
        lines.push(`  Args: ${truncateWithOmission(rawArgs, 600)}`);
      }
    }

    if (r.content) {
      lines.push('[Content]');
      lines.push(truncateWithOmission(r.content, 1500));
    }

    lines.push(''); // 区切り
  }

  if (clamped) {
    lines.push('(clamped to 10 steps)');
  }

  return lines.join('\n');
}
