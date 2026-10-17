import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

import path from 'node:path';

function getChangedFiles(): string[] {
  try {
    const status = execSync('git status --porcelain -uall', {
      encoding: 'utf8',
    });
    return status
      .split('\n')
      .filter((l) => l.length > 3 && !l.startsWith(' D') && !l.startsWith('D '))
      .map((l) => l.slice(3).split(' -> ').pop() ?? '')
      .map((p) => p.replace(/^"|"$/g, ''))
      .filter((p) => p.length > 0 && fs.existsSync(p));
  } catch (_e) {
    return [];
  }
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const files = args.length > 0 ? args : getChangedFiles();

if (files.length === 0) {
  console.log('✅ No changed files found. Check passed.');
  process.exit(0);
}

const fileArgs = files.map((f) => `"${f}"`).join(' ');

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

const SIZE_LIMITS: Record<string, number> = {
  component: 300,
  hook: 150,
  store: 200,
};

function getCategory(filePath: string): 'component' | 'hook' | 'store' | null {
  if (/\.(test|spec)\.[tj]sx?$/.test(filePath)) return null;
  const base = path.basename(filePath);
  if (
    filePath.includes('components/') ||
    filePath.includes('app/') ||
    filePath.includes('ui/')
  ) {
    if (base.endsWith('.tsx')) return 'component';
  }
  if (base.startsWith('use') && base.endsWith('.ts')) return 'hook';
  if (filePath.includes('stores/') || base.includes('store')) return 'store';
  return null;
}

try {
  // 0. Custom Validations (Odin Strict)
  let hasError = false;
  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf8');

    // Check A: Open Decisions Detection (exclude validator scripts themselves)
    if (
      !file.includes('check-worker.ts') &&
      !file.includes('check-reviewer.ts')
    ) {
      if (/(TODO:\s*ASK|FIXME)/i.test(content)) {
        console.error(
          `[ERROR] Open Decisions (TODO: ASK / FIXME) found in ${file}. Resolve them before marking task as complete.`,
        );
        hasError = true;
      }
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

    // Check C: File Size Limits
    const category = getCategory(file);
    if (category) {
      const lineCount = content.split('\n').length;
      const limit = SIZE_LIMITS[category];
      if (lineCount > limit) {
        console.error(
          `[ERROR] File size limit exceeded: ${file} (${lineCount} lines). Max allowed for ${category} is ${limit} lines.`,
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
