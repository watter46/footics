import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('[ERROR] Target files must be provided.');
  process.exit(1);
}

const fileArgs = files.join(' ');

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  // 0. Custom Validations (Odin Strict)
  let hasError = false;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf8');

    // Check A: Open Decisions Detection
    if (/(TODO:\s*ASK|FIXME)/i.test(content)) {
      console.error(
        `[ERROR] Open Decisions (TODO: ASK / FIXME) found in ${file}. Resolve them before marking task as complete.`,
      );
      hasError = true;
    }

    // Check B: Schema Migration Detection
    if (file.endsWith('schema.ts') || file.endsWith('schema.js')) {
      if (!/\.upgrade\s*\(/.test(content)) {
        console.error(
          `[ERROR] schema.ts was modified, but no '.upgrade()' block was detected. You must write a Dexie migration block.`,
        );
        hasError = true;
      }
    }
  }

  if (hasError) {
    process.exit(1);
  }

  // 1. Biome (Lint & Format)
  run(
    `./node_modules/.bin/biome check --diagnostic-level=error --max-diagnostics=20 ${fileArgs}`,
  );

  // 2. Type Check (Scoped)
  run(`bun scripts/verify/type-check-scoped.ts ${fileArgs}`);

  // 3. Vitest (Test)
  run(
    `./node_modules/.bin/vitest run related ${fileArgs} --passWithNoTests --reporter=default --no-color`,
  );

  console.log('\n✅ Worker checks passed.');
} catch (err) {
  console.error('\n❌ Worker checks failed.');
  process.exit(1);
}
