import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import path from 'node:path';
import {
  loadGuardrailsBaseline,
  normalizeRepoPath,
  validateFileAgainstBaseline,
} from './lib/code-guardrails';

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
          const parent =
            entry.parentPath ||
            (entry as unknown as { path?: string }).path ||
            '';
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
  console.log('✅ No changed files found. Check passed.');
  process.exit(0);
}

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  // 0. Custom Validations (Guardrails + Baseline)
  const baseline = loadGuardrailsBaseline();
  const errors: string[] = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    const normFile = normalizeRepoPath(file);
    errors.push(...validateFileAgainstBaseline(normFile, content, baseline));
  }

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(err);
    }
    process.exit(1);
  }

  // 1. Biome (Lint & Format on assigned files)
  const biomeFiles = files.filter((f) => /\.(jsx?|tsx?|jsonc?|css)$/.test(f));
  if (biomeFiles.length > 0) {
    const biomeArgs = biomeFiles.map((f) => `"${f}"`).join(' ');
    run(
      `./node_modules/.bin/biome check --write --diagnostic-level=error --max-diagnostics=20 ${biomeArgs}`,
    );
  }

  // 2. Scoped TypeScript Check (Phase 内の型整合を Worker 自身が即時修復できるようにする)
  const normFiles = files.map((f) => normalizeRepoPath(f));
  const tsCheckTargets = normFiles.filter(
    (f) =>
      /^(src|tests|extension)\//.test(f) &&
      /\.(ts|tsx)$/.test(f) &&
      !f.endsWith('.d.ts'),
  );
  if (tsCheckTargets.length > 0) {
    const tsArgs = tsCheckTargets.map((f) => `"${f}"`).join(' ');
    run(`bun scripts/verify/type-check-scoped.ts --scoped-only ${tsArgs}`);
  }

  // 3. Scoped Tests (Vitest for app/extension, Bun Test for .agents/scripts)
  const testFiles = normFiles.filter((f) => /\.(test|spec)\.[tj]sx?$/.test(f));
  const vitestFiles = testFiles.filter((f) =>
    /^(src|tests|extension)\//.test(f),
  );
  const bunTestFiles = testFiles.filter((f) => /^(\.agents|scripts)\//.test(f));

  if (vitestFiles.length > 0) {
    const vitestArgs = vitestFiles.map((f) => `"${f}"`).join(' ');
    run(
      `./node_modules/.bin/vitest run ${vitestArgs} --passWithNoTests --reporter=default --no-color`,
    );
  }

  if (bunTestFiles.length > 0) {
    const bunTestArgs = bunTestFiles.map((f) => `"${f}"`).join(' ');
    run(`bun test ${bunTestArgs}`);
  }

  console.log(
    '\n✅ Phase checks passed (guardrails, biome, scoped tsc, phase tests). Full project tsc & integration tests run in ai:preflight / ai:commit.',
  );
} catch (err) {
  console.error('\n❌ Worker checks failed:', err);
  process.exit(1);
}
