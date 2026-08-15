const fs = require('node:fs');
const { execSync } = require('node:child_process');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  if (data.terminationReason === 'model_stop') {
    try {
      execSync('pnpm verify', { stdio: 'pipe' });
      console.log(JSON.stringify({ decision: 'allow' }));
    } catch (e) {
      console.log(
        JSON.stringify({
          decision: 'continue',
          reason:
            'pnpm verify failed. Please fix the errors before stopping. Error output:\n' +
            (e.stdout ? e.stdout.toString() : '') +
            '\n' +
            (e.stderr ? e.stderr.toString() : ''),
        }),
      );
    }
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
