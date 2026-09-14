import { execSync } from 'node:child_process';
import fs from 'node:fs';

function run(command: string) {
  console.log(`\n> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (_err) {
    console.error(`\n[ERROR] Command failed: ${command}`);
    process.exit(1);
  }
}

console.log('=== Scoped Verification ===');

// 1. Get changed files (staged and unstaged) that actually exist on disk
let changedFiles: string[] = [];
try {
  const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
  changedFiles = output
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f.length > 0 && fs.existsSync(f));
} catch (_e) {
  // If not a git repo or no HEAD, just continue or exit
}

if (changedFiles.length === 0) {
  console.log('No changed files found on disk. Skipping scoped check.');
  process.exit(0);
}

const jsTsFiles = changedFiles.filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));

if (jsTsFiles.length > 0) {
  console.log('Changed files:', jsTsFiles);

  // 2. Biome check
  const biomeFiles = jsTsFiles.join(' ');
  run(`pnpm exec biome check ${biomeFiles}`);

  // 3. Size check
  run(`pnpm exec tsx scripts/lint/check-file-size.ts ${biomeFiles}`);

  // 4. Vitest related
  run(`pnpm exec vitest run related ${biomeFiles} --passWithNoTests`);

  // 5. Scoped Type check
  run(`pnpm exec tsx scripts/verify/type-check-scoped.ts ${biomeFiles}`);
} else {
  console.log('No JS/TS changed files found. Skipping code checks.');
}

console.log('\n✅ All scoped checks passed.');
