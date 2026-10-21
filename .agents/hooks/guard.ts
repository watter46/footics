import { checkAgentAccessGuard } from './guard/agent-access-guard';
import { checkGateguard } from './guard/gateguard-filter';
import { parseExecutable, splitCommands, tokenize } from './guard/parser';
import { checkSafetyGuard } from './guard/safety-filter';
import { checkSubagentGuard } from './guard/subagent-guard';
import { checkTaskSizeGuard } from './guard/task-size-guard';
import { checkTokenGuard } from './guard/token-filter';
import { checkViewGuard } from './guard/view-filter';

interface Rewrite {
  raw: string;
  next: string;
  executable: string;
}

/** パイプの受け側では標準入力を読むため、ファイル引数前提の rtk 書き換えを適用しない */
const STDIN_CONSUMERS = new Set([
  'cat',
  'less',
  'more',
  'head',
  'tail',
  'grep',
  'rg',
]);

function isPipeTarget(cmdLine: string, idx: number): boolean {
  const before = cmdLine.slice(0, idx).trimEnd();
  return before.endsWith('|') && !before.endsWith('||');
}

/**
 * 各サブコマンドの書き換えを元のコマンドライン全体に合成する。
 * 以前は最後の1サブコマンドの書き換え結果でコマンドライン全体を置換していたため、
 * `a && b` や `x | head -n 5` が壊れていた。
 */
function composeRewrites(cmdLine: string, rewrites: Rewrite[]): string | null {
  let out = '';
  let cursor = 0;
  for (const { raw, next, executable } of rewrites) {
    const idx = cmdLine.indexOf(raw, cursor);
    if (idx === -1) continue;
    if (STDIN_CONSUMERS.has(executable) && isPipeTarget(cmdLine, idx)) continue;
    out += cmdLine.slice(cursor, idx) + next;
    cursor = idx + raw.length;
  }
  out += cmdLine.slice(cursor);
  return out === cmdLine ? null : out;
}

function evaluateCommand(cmdLine: string): any {
  if (!cmdLine || typeof cmdLine !== 'string' || !cmdLine.trim()) {
    return { decision: 'allow' };
  }

  const subCommands = splitCommands(cmdLine);
  let highestDecision: any = null;
  const rewrites: Rewrite[] = [];

  for (const rawSubCmd of subCommands) {
    const tokens = tokenize(rawSubCmd);
    if (tokens.length === 0) continue;

    const parsed = parseExecutable(tokens);
    if (!parsed.executable) continue;

    // サブシェル実行 (bash -c "...", sh -c "...", eval "...") の再帰評価
    if (['bash', 'sh', 'zsh', 'dash', 'ksh'].includes(parsed.executable)) {
      const cIdx = parsed.args.indexOf('-c');
      if (cIdx !== -1 && parsed.args[cIdx + 1]) {
        const subResult = evaluateCommand(parsed.args[cIdx + 1]);
        if (subResult.decision === 'deny') return subResult;
        if (subResult.decision === 'force_ask') highestDecision = subResult;
      }
    }
    if (parsed.executable === 'eval') {
      const evalStr = parsed.args.join(' ');
      if (evalStr) {
        const subResult = evaluateCommand(evalStr);
        if (subResult.decision === 'deny') return subResult;
        if (subResult.decision === 'force_ask') highestDecision = subResult;
      }
    }

    // Safety Guard の評価
    const safetyRes = checkSafetyGuard(parsed, rawSubCmd, cmdLine);
    if (safetyRes) {
      if (safetyRes.decision === 'deny') return safetyRes;
      if (
        safetyRes.decision === 'force_ask' &&
        (!highestDecision || highestDecision.decision !== 'deny')
      ) {
        highestDecision = safetyRes;
      }
    }

    // Token Guard の評価 (deny, force_ask, または overwrite 自動書き換え)
    const tokenRes = checkTokenGuard(parsed, rawSubCmd, cmdLine);
    if (tokenRes) {
      if (tokenRes.decision === 'deny') return tokenRes;
      if (
        tokenRes.decision === 'force_ask' &&
        (!highestDecision || highestDecision.decision !== 'deny')
      ) {
        highestDecision = tokenRes;
      } else if (tokenRes.overwrite?.CommandLine) {
        rewrites.push({
          raw: rawSubCmd,
          next: tokenRes.overwrite.CommandLine,
          executable: parsed.executable,
        });
      }
    }
  }

  if (highestDecision && highestDecision.decision !== 'allow') {
    return highestDecision;
  }
  const composed = composeRewrites(cmdLine, rewrites);
  if (composed) {
    return { decision: 'allow', overwrite: { CommandLine: composed } };
  }
  return highestDecision || { decision: 'allow' };
}

function evaluatePayload(payload: any): any {
  if (
    payload.toolCall &&
    (payload.toolCall.name === 'replace_file_content' ||
      payload.toolCall.name === 'write_to_file' ||
      payload.toolCall.name === 'edit_file' ||
      payload.toolCall.name === 'write_file')
  ) {
    const accessRes = checkAgentAccessGuard(payload);
    if (accessRes && accessRes.decision === 'deny') {
      return accessRes;
    }
    const taskSizeRes = checkTaskSizeGuard(payload);
    if (taskSizeRes && taskSizeRes.decision === 'deny') {
      return taskSizeRes;
    }
    return checkGateguard(payload);
  }

  if (
    payload.toolCall &&
    (payload.toolCall.name === 'view_file' ||
      payload.toolCall.name === 'read_file')
  ) {
    const viewRes = checkViewGuard(payload);
    if (viewRes) return viewRes;
    return { decision: 'allow' };
  }

  if (payload.toolCall && payload.toolCall.name === 'send_message') {
    const subagentRes = checkSubagentGuard(payload);
    if (subagentRes) return subagentRes;
    return { decision: 'allow' };
  }

  if (payload.toolCall && payload.toolCall.name === 'define_subagent') {
    return {
      decision: 'deny',
      reason:
        "[GUARD] Dynamic subagent definition with 'define_subagent' is prohibited. You MUST use project-standard predefined agents via invoke_subagent (TypeName: 'worker' | 'scout' | 'reviewer') to ensure rule enforcement and token reduction.",
    };
  }

  let cmd = '';
  if (payload.toolCall && payload.toolCall.args) {
    cmd = (
      payload.toolCall.args.CommandLine ||
      payload.toolCall.args.command ||
      ''
    ).trim();
  } else {
    cmd = (payload.CommandLine || payload.command || '').trim();
  }

  return evaluateCommand(cmd);
}

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');

  process.stdin.on('data', (chunk) => {
    raw += chunk;
  });

  process.stdin.on('end', () => {
    try {
      const parsed = JSON.parse(raw);
      const result = evaluatePayload(parsed);
      console.log(JSON.stringify(result));
    } catch (_err) {
      console.log(JSON.stringify({ decision: 'allow' }));
    }
  });
}

export {
  evaluateCommand,
  evaluatePayload,
  parseExecutable,
  splitCommands,
  tokenize,
};
