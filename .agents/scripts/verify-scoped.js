const fs = require('node:fs');
const { execSync } = require('node:child_process');

function getChangedFiles() {
  try {
    const status = execSync('git status -s', { stdio: 'pipe' }).toString();
    return status
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter((file) => file && fs.existsSync(file));
  } catch (_e) {
    return [];
  }
}

function run() {
  const changedFiles = getChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[Fast Verify] No modified files detected. All checks passed.');
    return;
  }

  // 1. Biome Check on changed files only
  const biomeFiles = changedFiles.filter((f) =>
    /\.(js|ts|jsx|tsx|json|css)$/.test(f),
  );
  if (biomeFiles.length > 0) {
    console.log(
      `[Fast Verify] Checking lint/format for ${biomeFiles.length} modified file(s)...`,
    );
    execSync(`rtk pnpm biome check --write ${biomeFiles.join(' ')}`, {
      stdio: 'inherit',
    });
  }

  // 2. Scoped Type Check
  const tsFiles = changedFiles.filter(
    (f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'),
  );
  if (tsFiles.length > 0) {
    console.log(
      `[Fast Verify] Running scoped type check for ${tsFiles.length} file(s)...`,
    );
    execSync(`node .agents/scripts/type-check-scoped.js ${tsFiles.join(' ')}`, {
      stdio: 'inherit',
    });
  }

  console.log('[Fast Verify] All scoped checks passed successfully.');
}

try {
  run();
} catch (e) {
  process.exit(e.status || 1);
}
