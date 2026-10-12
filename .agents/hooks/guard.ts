import { checkGateguard } from './guard/gateguard-filter';
import { parseExecutable, splitCommands, tokenize } from './guard/parser';
import { checkSafetyGuard } from './guard/safety-filter';
import { checkTokenGuard } from './guard/token-filter';

function evaluateCommand(cmdLine: string): any {
  if (!cmdLine || typeof cmdLine !== 'string' || !cmdLine.trim()) {
    return { decision: 'allow' };
  }

  const subCommands = splitCommands(cmdLine);
  let highestDecision: any = null;

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
      } else if (
        tokenRes.overwrite &&
        (!highestDecision || highestDecision.decision === 'allow')
      ) {
        highestDecision = tokenRes;
      }
    }
  }

  return highestDecision || { decision: 'allow' };
}

function evaluatePayload(payload: any): any {
  if (
    payload.toolCall &&
    (payload.toolCall.name === 'replace_file_content' ||
      payload.toolCall.name === 'write_to_file')
  ) {
    return checkGateguard(payload);
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
