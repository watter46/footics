const fs = require('node:fs');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const data = JSON.parse(input);

  const cmd = data.toolCall?.args?.CommandLine || '';

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
  } else {
    console.log(JSON.stringify({ decision: 'allow' }));
  }
} catch (_e) {
  console.log(JSON.stringify({ decision: 'allow' }));
}
