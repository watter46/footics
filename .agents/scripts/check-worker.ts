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

const fileArgs = files.map((f) => `"${f}"`).join(' ');

function run(command: string) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: 'inherit' });
}

try {
  // 0. Custom Validations (Odin Strict + Baseline Guardrails)
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

  // 2. Vitest (Run explicit test files in this Phase directly)
  const testFiles = files.filter((f) => /\.(test|spec)\.[tj]sx?$/.test(f));
  if (testFiles.length > 0) {
    const testArgs = testFiles.map((f) => `"${f}"`).join(' ');
    run(
      `./node_modules/.bin/vitest run ${testArgs} --passWithNoTests --reporter=default --no-color`,
    );
  }

  console.log(
    '\n✅ Phase checks passed (guardrails, biome, phase tests). Full tsc & integration tests will run in ai:preflight / ai:commit.',
  );
} catch (err) {
  console.error('\n❌ Worker checks failed:', err);
  process.exit(1);
}
