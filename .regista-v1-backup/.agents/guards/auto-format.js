const fs = require('node:fs');
const { execSync } = require('node:child_process');

try {
  const input = fs.readFileSync(0, 'utf-8');
  const _data = JSON.parse(input);
  // Find modified/untracked files ending with valid extensions and format them
  const changedFiles = execSync('git ls-files -m -o --exclude-standard')
    .toString()
    .trim()
    .split('\n')
    .filter(Boolean);
  const filesToFormat = changedFiles.filter((f) =>
    /\.(js|ts|jsx|tsx|json|md|css)$/.test(f),
  );

  if (filesToFormat.length > 0) {
    execSync(`pnpm biome format --write ${filesToFormat.join(' ')}`);
  }
} catch (_e) {
  // Ignore errors to not break the hook
}
// Must output empty JSON object for PostToolUse
console.log(JSON.stringify({}));
