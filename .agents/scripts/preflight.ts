import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  defaultExtractHead,
  formatVerdict,
  runStep,
  type StepResult,
  skippedStep,
} from './lib/run-step';

const BIOME_RE = /\.(jsx?|tsx?|jsonc?|css)$/;
const TS_RE = /\.(ts|tsx)$/;
/** tsconfig の型環境 (next/react) が有効なのは src と tests のみ。.agents は bun 型が無く誤検出する。 */
const TSC_ROOT_RE = /^(src|tests)\//;
const VITEST_ROOT_RE = /^(src|tests|extension)\//;
const BUN_ROOT_RE = /^(\.agents|scripts)\//;
const TEST_FILE_RE = /\.test\.(ts|tsx)$/;
const BIOME_BIN = './node_modules/.bin/biome';

export interface PreflightPlan {
  biome: string[];
  tsc: string[];
  vitest: string[];
  bunTests: string[];
}

/** `git status --porcelain -uall` の出力から対象ファイルパスを抽出 (rename は新パス) */
export function parsePorcelain(text: string): string[] {
  return text
    .split('\n')
    .filter((l) => l.length > 3)
    .filter((l) => !l.startsWith(' D') && !l.startsWith('D '))
    .map((l) => l.slice(3).split(' -> ').pop() ?? '')
    .map((p) => p.replace(/^"|"$/g, ''))
    .filter((p) => p.length > 0);
}

function listTests(dir: string, root: string): string[] {
  const out: string[] = [];
  for (const d of [dir, path.join(dir, '__tests__')]) {
    const abs = path.join(root, d);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) continue;
    for (const f of fs.readdirSync(abs)) {
      if (TEST_FILE_RE.test(f)) out.push(path.join(d, f));
    }
  }
  return out;
}

/** 変更ファイルから最寄りのテストを探す (.agents / scripts 配下用)。 */
export function findBunTests(file: string, root: string): string[] {
  if (TEST_FILE_RE.test(file)) return [file];
  const top = file.split('/')[0];
  let dir = path.dirname(file);
  while (dir !== '.' && dir !== top && dir.length > 0) {
    const tests = listTests(dir, root);
    if (tests.length > 0) return tests;
    dir = path.dirname(dir);
  }
  return listTests(top, root);
}

export function classify(files: string[], root: string): PreflightPlan {
  const bunTests = new Set<string>();
  for (const f of files.filter((x) => BUN_ROOT_RE.test(x) && TS_RE.test(x))) {
    for (const t of findBunTests(f, root)) bunTests.add(`./${t}`);
  }
  return {
    biome: files.filter((f) => BIOME_RE.test(f)),
    tsc: files.filter(
      (f) => TSC_ROOT_RE.test(f) && TS_RE.test(f) && !f.endsWith('.d.ts'),
    ),
    vitest: files.filter((f) => VITEST_ROOT_RE.test(f) && TS_RE.test(f)),
    bunTests: [...bunTests],
  };
}

interface BiomeDiag {
  severity: string;
  message: string;
  category: string;
  location?: { path?: string; start?: { line?: number; column?: number } };
}

function parseBiomeJson(output: string): {
  errors: number;
  warnings: number;
  diagnostics: BiomeDiag[];
} {
  const line = output.split('\n').find((l) => l.startsWith('{"summary"'));
  if (!line) return { errors: 0, warnings: 0, diagnostics: [] };
  const json = JSON.parse(line);
  return {
    errors: json.summary?.errors ?? 0,
    warnings: json.summary?.warnings ?? 0,
    diagnostics: json.diagnostics ?? [],
  };
}

export function biomeSummary(output: string): string {
  const { errors, warnings } = parseBiomeJson(output);
  return `${errors}e/${warnings}w`;
}

export function biomeHead(output: string, max: number): string[] {
  try {
    const errs = parseBiomeJson(output).diagnostics.filter(
      (d) => d.severity === 'error',
    );
    if (errs.length === 0) return defaultExtractHead(output, max);
    return errs.slice(0, max).map((d) => {
      const loc = d.location;
      const pos = `${loc?.path ?? '?'}:${loc?.start?.line ?? 0}:${loc?.start?.column ?? 0}`;
      return `${pos} ${d.category} ${d.message}`;
    });
  } catch {
    return defaultExtractHead(output, max);
  }
}

function countSummary(output: string, re: RegExp, suffix = '✓'): string {
  const m = output.match(re);
  return m ? `${m[1]}${suffix}` : 'ok';
}

export function vitestSummary(output: string): string {
  if (/No test files found/i.test(output)) return '0(no related)';
  return countSummary(output, /Tests\s+(?:\d+ failed \| )?(\d+) passed/);
}

export function bunTestSummary(output: string): string {
  return countSummary(output, /(\d+) pass\b/);
}

const CODE_FILE_RE = /\.(jsx?|tsx?|jsonc?|css)$/;

function runBiome(files: string[]): Promise<StepResult> {
  if (files.length === 0)
    return Promise.resolve(skippedStep('biome', 'no files'));
  return runStep(
    'biome',
    [
      BIOME_BIN,
      'check',
      '--colors=off',
      '--reporter=json',
      '--diagnostic-level=warn',
      '--no-errors-on-unmatched',
      ...files,
    ],
    { summarize: biomeSummary, extractHead: biomeHead },
  );
}

function runTypes(files: string[], scopedOnly = false): Promise<StepResult> {
  if (files.length === 0) return Promise.resolve(skippedStep('tsc', 'no ts'));
  return runStep('tsc', [
    'bun',
    'scripts/verify/type-check-scoped.ts',
    ...(scopedOnly ? ['--scoped-only'] : []),
    ...files,
  ]);
}

function runTests(plan: PreflightPlan): Promise<StepResult>[] {
  const steps: Promise<StepResult>[] = [];
  if (plan.bunTests.length > 0) {
    steps.push(
      runStep('bun-test', ['bun', 'test', ...plan.bunTests], {
        summarize: bunTestSummary,
      }),
    );
  }
  if (plan.vitest.length > 0) {
    steps.push(
      runStep(
        'vitest',
        [
          './node_modules/.bin/vitest',
          'run',
          'related',
          ...plan.vitest,
          '--passWithNoTests',
          '--reporter=default',
          '--no-color',
        ],
        { summarize: vitestSummary },
      ),
    );
  }
  if (steps.length === 0) {
    steps.push(Promise.resolve(skippedStep('tests', 'none')));
  }
  return steps;
}

function collectFiles(
  args: string[],
  cwd: string,
): { files: string[]; untracked: number } {
  if (args.length > 0) return { files: args, untracked: 0 };
  const proc = spawnSync('git', ['status', '--porcelain', '-uall'], {
    cwd,
    encoding: 'utf8',
  });
  const text = proc.stdout ?? '';
  const untracked = text.split('\n').filter((l) => l.startsWith('??')).length;
  const files = parsePorcelain(text).filter((f) =>
    fs.existsSync(path.join(cwd, f)),
  );
  return { files, untracked };
}

function runSize(files: string[]): Promise<StepResult> {
  const codeFiles = files.filter((f) => /\.(tsx?|jsx?)$/.test(f));
  if (codeFiles.length === 0)
    return Promise.resolve(skippedStep('size', 'no code'));
  return runStep('size', [
    'bun',
    'scripts/lint/check-file-size.ts',
    ...codeFiles,
  ]);
}

export interface PreflightResult {
  ok: boolean;
  code: number;
  results: StepResult[];
  files: string[];
  untracked: number;
  verdict: string;
}

export async function executePreflight(
  args: string[],
  cwd = process.cwd(),
): Promise<PreflightResult> {
  const { files, untracked } = collectFiles(args, cwd);
  if (files.length === 0) {
    const verdict = 'PREFLIGHT ok | files=0 | nothing to commit';
    return {
      ok: true,
      code: 0,
      results: [],
      files: [],
      untracked: 0,
      verdict,
    };
  }

  // Fast-Path: 非コードファイルのみ（Markdown, テキスト等）の場合は静的解析・テストをスキップ
  if (!files.some((f) => CODE_FILE_RE.test(f))) {
    const verdict = `PREFLIGHT ok | files=${files.length}(+${untracked} untracked) | fast-path(non-code only)`;
    return {
      ok: true,
      code: 0,
      results: [skippedStep('all', 'non-code only')],
      files,
      untracked,
      verdict,
    };
  }

  const plan = classify(files, cwd);
  const results = await Promise.all([
    runSize(files),
    runBiome(plan.biome),
    runTypes(plan.tsc, args.length > 0),
    ...runTests(plan),
  ]);

  const ok = results.every((r) => r.ok);
  const verdict = formatVerdict(
    results,
    `files=${files.length}(+${untracked} untracked)`,
  );

  return {
    ok,
    code: ok ? 0 : 1,
    results,
    files,
    untracked,
    verdict,
  };
}

export async function runPreflight(
  args: string[],
  cwd = process.cwd(),
): Promise<number> {
  const result = await executePreflight(args, cwd);
  console.log(result.verdict);
  if (result.files.length === 0) {
    console.log(
      "[HINT] No uncommitted changes detected. To check specific files, run 'bun run ai:check <path>'.",
    );
  }
  return result.code;
}

if (import.meta.main) {
  runPreflight(process.argv.slice(2).filter((a) => !a.startsWith('-'))).then(
    (code) => process.exit(code),
  );
}
