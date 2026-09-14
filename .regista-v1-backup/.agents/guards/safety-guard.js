const fs = require('node:fs');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  const toolName = data.toolCall?.name || '';
  const args = data.toolCall?.args || {};
  const cmd = args.CommandLine || '';

  // 1. manage_task によるポーリング (status 連打) の遮断
  if (toolName === 'manage_task' && args.Action === 'status') {
    console.log(
      JSON.stringify({
        decision: 'deny',
        reason:
          '[TOKEN GUARD] manage_task(status) によるステータスポーリングはトークン浪費防止のため禁止されています。Antigravity の Reactive Wakeup（完了時の自動通知）をお待ちください。追加のツール呼び出しを停止してターンを終了してください。',
      }),
    );
    process.exit(0);
  }

  const forbiddenCommandRegex =
    /(?:^|&&|\|\||;|&|\|)\s*(pnpm|npm|yarn|npx|biome|tsc|vitest)\b/;

  if (
    cmd.includes('rm -rf') ||
    cmd.includes('git reset --hard') ||
    cmd.includes('git push --force')
  ) {
    console.log(
      JSON.stringify({
        decision: 'ask',
        reason:
          'Destructive command detected. Please confirm before proceeding.',
      }),
    );
  } else if (forbiddenCommandRegex.test(cmd)) {
    console.log(
      JSON.stringify({
        decision: 'deny',
        reason:
          '[RULE VIOLATION] Raw execution of pnpm/npm/yarn/npx/biome/tsc/vitest is strictly prohibited. You MUST wrap the command with rtk (e.g., "rtk pnpm ..."). Please correct your command and try again.',
      }),
    );
  } else if (/(?:^|&&|\|\||;|&|\|)\s*git\s+(status|add|commit|push|pull)\b(?!.*>.*\/dev\/null)/.test(cmd)) {
    console.log(
      JSON.stringify({
        decision: 'deny',
        reason:
          '[TOKEN GUARD] Raw execution of noisy git commands (status, add, etc.) is prohibited to save tokens. Please use "rtk git" OR append "> /dev/null 2>&1" to your command.',
      }),
    );
  } else {
    // 2. 広域テスト実行の遮断 (vitest でテストファイルを指定せず全体・ディレクトリを実行することを防止)
    const vitestMatch = cmd.match(/(?:^|&&|\|\||;|&|\|)\s*(?:rtk\s+)?vitest(?:\s+run)?(?:\s+([^\n&|;]+))?/);
    if (vitestMatch) {
      const rawArgString = vitestMatch[1] || '';
      const vitestArgs = rawArgString.trim().split(/\s+/).filter(arg => arg && !arg.startsWith('-'));
      const hasSpecificTestFile = vitestArgs.some(arg => /\.(test|spec)\.[a-zA-Z0-9]+$/.test(arg));
      if (!hasSpecificTestFile) {
        console.log(
          JSON.stringify({
            decision: 'deny',
            reason:
              '[TOKEN GUARD] 広域テスト（全体またはディレクトリ単位）の実行は非同期化・ポーリング・コンテキスト肥大化を防ぐため禁止されています。対象のテストファイル（例: "rtk vitest run src/.../xxx.test.tsx"）をピンポイントで指定してください。',
          }),
        );
        process.exit(0);
      }
    }

    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
