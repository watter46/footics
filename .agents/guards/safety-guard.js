const fs = require('node:fs');

function isSystemPath(targetFile) {
  return (
    targetFile.includes('/.agents/') ||
    targetFile.includes('/scripts/') ||
    targetFile.endsWith('/AGENTS.md') ||
    targetFile.endsWith('AGENTS.md') ||
    targetFile.includes('Makefile') ||
    targetFile.endsWith('/biome.json') ||
    targetFile.endsWith('biome.json') ||
    targetFile.endsWith('/package.json') ||
    targetFile.endsWith('package.json') ||
    targetFile.endsWith('/tsconfig.json') ||
    targetFile.endsWith('tsconfig.json')
  );
}

function checkWorkerScope(targetFile, normalizedRole) {
  if (normalizedRole.includes('gm')) {
    if (!targetFile.includes('/specs/') && !targetFile.startsWith('specs/')) {
      return '[Regista Security] Regista-GM はプロダクトコードを直接編集できません。仕様書 (specs/**) を策定してください。';
    }
  } else if (normalizedRole.includes('canvas')) {
    if (
      !targetFile.includes('/canvas/') &&
      !targetFile.includes('/video-canvas/')
    ) {
      return `[Regista Security] worker-canvas の担当外 (${targetFile}) への書き込みは拒否されました。`;
    }
  } else if (normalizedRole.includes('data')) {
    if (
      !targetFile.includes('/lib/') &&
      !targetFile.includes('/stores/') &&
      !targetFile.includes('/types/')
    ) {
      return `[Regista Security] worker-data の担当外 (${targetFile}) への書き込みは拒否されました。`;
    }
  } else if (normalizedRole.includes('extension')) {
    if (
      !targetFile.includes('/extension/') &&
      !targetFile.startsWith('extension/')
    ) {
      return `[Regista Security] worker-extension の担当外 (${targetFile}) への書き込みは拒否されました。`;
    }
  } else if (normalizedRole.includes('frontend')) {
    if (
      !targetFile.includes('/app/') &&
      !targetFile.includes('/components/ui/') &&
      !targetFile.includes('/styles/')
    ) {
      return `[Regista Security] worker-frontend の担当外 (${targetFile}) への書き込みは拒否されました。`;
    }
  }
  return null;
}

function checkFileEditGuard(targetFile, role, isSubagent) {
  const normalizedRole = role.toLowerCase();
  const isMetaAgent =
    !isSubagent ||
    normalizedRole.includes('meta-agent') ||
    normalizedRole.includes('meta');

  if (isSystemPath(targetFile) && !isMetaAgent) {
    return {
      decision: 'deny',
      reason: `[Regista Security] システムファイル (${targetFile}) の編集は拒否されました。権限: メタエージェントのみ`,
    };
  }

  if (role) {
    const errorMsg = checkWorkerScope(targetFile, normalizedRole);
    if (errorMsg) {
      return { decision: 'deny', reason: errorMsg };
    }
  }

  return { decision: 'allow' };
}

function checkCommandGuard(cmd) {
  if (
    cmd.includes('rm -rf /') ||
    cmd.includes('git reset --hard') ||
    cmd.includes('git push --force') ||
    cmd.includes('git clean -fdx')
  ) {
    return {
      decision: 'deny',
      reason: '[Regista Security] 破壊的コマンドの実行はブロックされました。',
    };
  }

  const isBareTest =
    /^(rtk\s+)?(vitest(\s+run)?|pnpm\s+test|npm\s+test|yarn\s+test)$/.test(cmd);
  if (isBareTest) {
    return {
      decision: 'deny',
      reason:
        '[Regista Token Guard] 引数なしの全体テスト実行は禁止されています。対象ファイルを指定してください (例: rtk vitest run <file>)。',
    };
  }

  if (/find\s+(\/|\/home|~|\.\.)/.test(cmd)) {
    return {
      decision: 'deny',
      reason:
        '[Regista Token Guard] 広域 find はブロックされました。rtk find <path> -name <pattern> で絞り込んでください。',
    };
  }

  const targetsNeedingRtk = [
    /^vitest\b/,
    /^pnpm\s+(test|verify|biome|type-check)/,
    /^tsc\b/,
    /^biome\b/,
    /^rg\b/,
    /^grep\b/,
    /^find\b/,
    /^git\s+(diff|status|log)\b/,
  ];

  if (
    targetsNeedingRtk.some((pattern) => pattern.test(cmd)) &&
    !cmd.startsWith('rtk ')
  ) {
    return {
      decision: 'allow',
      overwrite: { CommandLine: `rtk ${cmd}` }
    };
  }

  return { decision: 'allow' };
}

function main() {
  let input = '';
  try {
    input = fs.readFileSync(0, 'utf-8');
  } catch {
    return;
  }
  if (!input) return;

  const payload = JSON.parse(input);
  const toolCall = payload.toolCall || {};
  const args = toolCall.args || {};

  const role =
    payload.subagentRole ||
    payload.role ||
    payload.subagentType ||
    payload.typeName ||
    '';
  const isSubagent = Boolean(
    payload.isSubagent || payload.subagentConversationId || role,
  );

  let response = { decision: 'allow' };

  if (
    toolCall.name === 'write_to_file' ||
    toolCall.name === 'replace_file_content'
  ) {
    response = checkFileEditGuard(args.TargetFile || '', role, isSubagent);
  } else if (toolCall.name === 'run_command') {
    response = checkCommandGuard((args.CommandLine || '').trim());
  }

  console.log(JSON.stringify(response));
}

main();
