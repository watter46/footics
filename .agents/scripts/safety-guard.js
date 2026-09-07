const fs = require('node:fs');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  const cmd = data.toolCall?.args?.CommandLine || '';
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
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
