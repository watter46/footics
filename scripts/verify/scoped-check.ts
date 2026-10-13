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

// 1. Get changed files (staged and unstaged) that actually exist on disk, or use arguments
const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
let changedFiles: string[] = args.filter((f) => fs.existsSync(f));

if (changedFiles.length === 0) {
  try {
    const output = execSync('git diff --name-only HEAD', { encoding: 'utf8' });
    changedFiles = output
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => f.length > 0 && fs.existsSync(f));
  } catch (_e) {
    // If not a git repo or no HEAD, just continue or exit
  }
}

if (changedFiles.length === 0) {
  console.log('No changed files found on disk. Skipping scoped check.');
  console.log(
    "[HINT] No uncommitted changes detected. To check specific files, run 'bun run lint <path>' or 'bun run agent:check-worker <path>'.",
  );
  process.exit(0);
}

const jsTsFiles = changedFiles.filter((f) => /\.(js|jsx|ts|tsx)$/.test(f));

if (jsTsFiles.length > 0) {
  console.log('Changed files:', jsTsFiles);

  // 1. AST-Grep: Auto-refactor and token reduction (e.g., removing debug statements)
  // This reduces LLM token usage by cleaning up the code automatically before any other checks.
  console.log('\n--- Running AST-Grep Auto Refactor ---');
  try {
    // Example: remove console.log to save tokens in production code
    // run(`bunx ast-grep run --pattern 'console.log($$$)' --rewrite '' --update-all ${jsTsFiles.join(' ')}`);
    console.log(
      'AST-Grep rules can be defined here for automatic token reduction.',
    );
  } catch (_e) {
    console.warn('AST-Grep refactor step had minor issues, continuing...');
  }

  // 2. Biome check
  const biomeFiles = jsTsFiles.join(' ');
  run(`bunx biome check ${biomeFiles}`);

  // 3. Size check
  run(`bun scripts/lint/check-file-size.ts ${biomeFiles}`);

  // 4. Vitest related (Logic verification)
  run(`bun vitest run related ${biomeFiles} --passWithNoTests`);

  // 5. Scoped Type check
  run(`bun scripts/verify/type-check-scoped.ts ${biomeFiles}`);

  // 6. Playwright E2E verification placeholder
  // Check if E2E tests are affected
  console.log('\n--- Playwright E2E Check ---');
  console.log(
    'If UI components changed, consider running: pnpm exec playwright test',
  );
} else {
  console.log('No JS/TS changed files found. Skipping code checks.');
}

console.log('\n✅ All scoped checks passed.');
