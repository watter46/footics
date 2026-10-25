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

function expandFiles(filePaths: string[]): string[] {
  const result: string[] = [];
  for (const p of filePaths) {
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isDirectory()) {
      const entries = fs.readdirSync(p, {
        withFileTypes: true,
        recursive: true,
      });
      for (const entry of entries) {
        if (entry.isFile()) {
          const parent = entry.parentPath || (entry as any).path;
          result.push(path.join(parent, entry.name));
        }
      }
    } else {
      result.push(p);
    }
  }
  return result;
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const rawFiles = args.length > 0 ? args : getChangedFiles();
const files = expandFiles(rawFiles);
if (files.length === 0) {
  console.log('✅ No changed files found. Reviewer check passed.');
  process.exit(0);
}

const fileArgs = files.map((f) => `"${f}"`).join(' ');

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  // -1. Task File Integrity Check (Odin Strict)
  const taskFiles = files.filter(
    (f) => f.includes('tasks/TASK-') && f.endsWith('.md'),
  );
  if (taskFiles.length > 0) {
    for (const tf of taskFiles) {
      run(`bun scripts/task/validate-task.ts "${tf}"`);
    }
  } else {
    try {
      run(`bun scripts/task/validate-task.ts`);
    } catch (_e) {
      // タスクファイルがない場合は無視
    }
  }

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
    if (
      path.basename(file) === 'schema.ts' ||
      path.basename(file) === 'schema.js'
    ) {
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

  // 4. Dependency Cruiser (Architecture rule validation — Reviewer only)
  const depcruiseConfig = fs.existsSync('.dependency-cruiser.cjs')
    ? '--config .dependency-cruiser.cjs'
    : '--no-config';
  run(`bunx depcruise ${depcruiseConfig} ${fileArgs}`);

  // 5. Reviewer Audit Bundle (Line limits & Git Diff)
  console.log('\n📊 === Reviewer Audit Summary ===');

  // A. File Size & Line Limit Check Table
  console.log('\n[File Metrics]');
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    const status =
      lines > 200 ? `⚠️ (${lines} lines > 200)` : `✅ (${lines} lines)`;
    console.log(`  - ${file}: ${status}`);
  }

  // B. Git Diff Summary
  console.log('\n[Changes Summary (git diff --stat)]');
  try {
    const diffStat = execSync(`git diff --stat ${fileArgs}`, {
      encoding: 'utf8',
    });
    console.log(diffStat || '  (No working tree diff)');
  } catch (_e) {}

  console.log('\n[Diff Snippet (git diff -U3)]');
  try {
    const diff = execSync(`git diff -U3 ${fileArgs}`, { encoding: 'utf8' });
    if (diff.trim()) {
      const diffLines = diff.split('\n');
      if (diffLines.length > 150) {
        console.log(diffLines.slice(0, 150).join('\n'));
        console.log(`\n... +${diffLines.length - 150} more diff lines`);
      } else {
        console.log(diff);
      }
    } else {
      console.log('  (No working tree diff)');
    }
  } catch (_e) {}

  console.log('\n✅ Reviewer checks passed.');
} catch (err) {
  console.error('\n❌ Reviewer checks failed.');
  process.exit(1);
}
