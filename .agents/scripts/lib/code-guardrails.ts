import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const MAX_FILE_LINES = 300;

export interface GuardrailsBaseline {
  maxLinesOver300: Record<string, number>;
  explicitAny: Record<string, number>;
  reactFc: string[];
  customEvent: string[];
  tacticalSingleton: string[];
  consoleLog: string[];
  deepRelativeImport: Record<string, number>;
  eslintDisable: string[];
  useClientViolations: string[];
  pascalCaseComponents: string[];
}

export interface FileMetrics {
  lines: number;
  explicitAny: number;
  reactFc: number;
  customEvent: number;
  tacticalSingleton: number;
  consoleLog: number;
  deepRelativeImport: number;
  eslintDisable: number;
  useClientViolation: boolean;
  isPascalComponent: boolean;
}

export function normalizeRepoPath(
  filePath: string,
  cwd = process.cwd(),
): string {
  const abs = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(cwd, filePath);
  return path.relative(cwd, abs).replace(/\\/g, '/').replace(/^\.\//, '');
}

export function isTestFile(normFile: string): boolean {
  return (
    /\.(test|spec)\.[tj]sx?$/.test(normFile) ||
    normFile.includes('__tests__/') ||
    normFile.startsWith('tests/') ||
    normFile.startsWith('src/test/')
  );
}

export function isScopedSourceFile(normFile: string): boolean {
  if (!/\.[tj]sx?$/.test(normFile) || normFile.endsWith('.d.ts')) return false;
  if (normFile.startsWith('extension/.wxt/')) return false;
  if (normFile.startsWith('extension/.output/')) return false;
  return normFile.startsWith('src/') || normFile.startsWith('extension/');
}

export function isExcludedFromLineLimit(normFile: string): boolean {
  if (isTestFile(normFile)) return true;
  return (
    normFile.startsWith('src/lib/data/') ||
    /-preset[s]?\.ts$/.test(normFile) ||
    normFile === 'src/lib/types/tactical-unified.ts' ||
    normFile.endsWith('sample-syntax-data.ts')
  );
}

const count = (s: string, re: RegExp): number => (s.match(re) ?? []).length;

export function computeFileMetrics(
  normFile: string,
  content: string,
): FileMetrics {
  const lines = content.split('\n').length;
  const nonTest = !isTestFile(normFile);
  const isLogger = normFile === 'src/lib/agents/logger.ts';
  const hasUseClient =
    /^\s*(?:\/\*[\s\S]*?\*\/\s*|\/\/[^\n]*\n\s*)*['"]use client['"]/.test(
      content,
    );
  const isHook =
    /^(?:.*\/)?use[A-Z0-9_-].*\.ts$/.test(normFile) ||
    normFile.includes('/hooks/');
  const isPureTs =
    normFile.endsWith('.ts') && !normFile.endsWith('.d.ts') && !isHook;
  const isAppPageOrLayout = /^src\/app\/(?:.*\/)?(page|layout)\.tsx$/.test(
    normFile,
  );
  const base = path.basename(normFile);

  return {
    lines,
    explicitAny: nonTest
      ? count(
          content,
          /(?::\s*any\b|\bas\s+any\b|<any>|any\[\]|\bas\s+unknown\s+as\b)/g,
        )
      : 0,
    reactFc:
      nonTest && normFile.endsWith('.tsx')
        ? count(
            content,
            /(?:\bReact\.FC\b|:\s*FC<|\bReact\.forwardRef\b|\bforwardRef\s*[<(])/g,
          )
        : 0,
    customEvent: nonTest
      ? count(content, /(?:\bnew\s+CustomEvent\b|\bdispatchEvent\s*\()/g)
      : 0,
    tacticalSingleton: nonTest
      ? count(
          content,
          /(?:\buseTacticalUnifiedStore\b|from\s+['"][^'"]*tactical-unified-store['"])/g,
        )
      : 0,
    consoleLog:
      nonTest && !isLogger ? count(content, /\bconsole\.log\s*\(/g) : 0,
    deepRelativeImport: nonTest
      ? count(content, /from\s+['"]\.\.\/\.\.\//g)
      : 0,
    eslintDisable: nonTest ? count(content, /eslint-disable/g) : 0,
    useClientViolation:
      nonTest && hasUseClient && (isPureTs || isAppPageOrLayout),
    isPascalComponent:
      nonTest &&
      normFile.endsWith('.tsx') &&
      !normFile.startsWith('src/app/') &&
      /^[A-Z]/.test(base),
  };
}

export function loadGuardrailsBaseline(
  cwd = process.cwd(),
): GuardrailsBaseline {
  const p = path.join(cwd, '.agents/guardrails-baseline.json');
  if (!fs.existsSync(p)) {
    return {
      maxLinesOver300: {},
      explicitAny: {},
      reactFc: [],
      customEvent: [],
      tacticalSingleton: [],
      consoleLog: [],
      deepRelativeImport: {},
      eslintDisable: [],
      useClientViolations: [],
      pascalCaseComponents: [],
    };
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as GuardrailsBaseline;
}

export function validateFileAgainstBaseline(
  normFile: string,
  content: string,
  baseline: GuardrailsBaseline,
): string[] {
  const errors: string[] = [];

  if (
    !normFile.includes('check-worker.ts') &&
    !normFile.includes('check-reviewer.ts') &&
    !normFile.includes('code-guardrails.ts') &&
    !isTestFile(normFile) &&
    /(TODO:\s*ASK|FIXME)/i.test(content)
  ) {
    errors.push(
      `[ERROR] Open Decisions (TODO: ASK / FIXME) found in ${normFile}. Resolve them before completing the task.`,
    );
  }

  if (
    (path.basename(normFile) === 'schema.ts' ||
      path.basename(normFile) === 'schema.js') &&
    !/\.upgrade\s*\(/.test(content)
  ) {
    errors.push(
      `[ERROR] ${normFile} was modified without a '.upgrade()' block. Dexie schema updates require non-destructive migrations.`,
    );
  }

  if (!isScopedSourceFile(normFile) || isTestFile(normFile)) return errors;

  const m = computeFileMetrics(normFile, content);

  if (!isExcludedFromLineLimit(normFile)) {
    const allowedLines = baseline.maxLinesOver300[normFile] ?? MAX_FILE_LINES;
    if (m.lines > allowedLines) {
      errors.push(
        `[ERROR] [R8: File Size] ${normFile} has ${m.lines} lines (max allowed: ${allowedLines} lines). Split into smaller modules (<=${MAX_FILE_LINES} lines).`,
      );
    }
  }

  const allowedAny = baseline.explicitAny[normFile] ?? 0;
  if (m.explicitAny > allowedAny) {
    errors.push(
      `[ERROR] [R1: Type Safety] ${normFile} contains ${m.explicitAny} 'any' / 'as unknown as' usage(s) (allowed baseline: ${allowedAny}).`,
    );
  }

  if (m.reactFc > 0 && !baseline.reactFc.includes(normFile)) {
    errors.push(
      `[ERROR] [R2: React 19] ${normFile} uses 'React.FC' or 'forwardRef'. Use function declaration with 'interface XxxProps'.`,
    );
  }

  const isCore = normFile.includes('src/features/tactical-unified/core/');
  const isStoreDef =
    normFile ===
      'src/features/tactical-unified/stores/tactical-unified-store.ts' ||
    normFile ===
      'src/features/tactical-unified/stores/tactical-unified-store-provider.tsx' ||
    normFile === 'src/stores/tactical-unified-store.ts';
  if (m.tacticalSingleton > 0 && !isStoreDef) {
    if (isCore || !baseline.tacticalSingleton.includes(normFile)) {
      errors.push(
        `[ERROR] [R4: Store Provider] ${normFile}: Direct reference to singleton 'useTacticalUnifiedStore' is prohibited.`,
      );
    }
  }

  if (m.customEvent > 0 && !baseline.customEvent.includes(normFile)) {
    errors.push(
      `[ERROR] [R6: Communication] ${normFile}: 'CustomEvent' / 'dispatchEvent' is prohibited.`,
    );
  }

  if (m.consoleLog > 0 && !baseline.consoleLog.includes(normFile)) {
    errors.push(
      `[ERROR] [R7: Logging] ${normFile}: 'console.log' is prohibited in production code.`,
    );
  }

  if (m.eslintDisable > 0 && !baseline.eslintDisable.includes(normFile)) {
    errors.push(
      `[ERROR] [R8: Tooling] ${normFile}: 'eslint-disable' comments are prohibited.`,
    );
  }

  if (
    m.isPascalComponent &&
    !baseline.pascalCaseComponents.includes(normFile)
  ) {
    errors.push(
      `[ERROR] [R8: Naming] ${normFile}: New component files must use 'kebab-case.tsx'.`,
    );
  }

  const allowedRel = baseline.deepRelativeImport[normFile] ?? 0;
  if (m.deepRelativeImport > allowedRel) {
    errors.push(
      `[ERROR] [R9: Imports] ${normFile} has ${m.deepRelativeImport} deep relative import(s) ('../../') (allowed baseline: ${allowedRel}).`,
    );
  }

  if (
    m.useClientViolation &&
    !baseline.useClientViolations.includes(normFile)
  ) {
    errors.push(
      `[ERROR] [R11: Next.js Boundary] ${normFile}: Do not place "'use client'" on pure .ts modules or Next.js page.tsx/layout.tsx.`,
    );
  }

  return errors;
}

export function generateBaselineFromRepo(
  files: string[],
  cwd = process.cwd(),
): GuardrailsBaseline {
  const b = loadGuardrailsBaseline('__nonexistent__');
  for (const rawFile of [...files].sort()) {
    const f = normalizeRepoPath(rawFile, cwd);
    const abs = path.join(cwd, f);
    if (!fs.existsSync(abs) || !isScopedSourceFile(f) || isTestFile(f))
      continue;
    const m = computeFileMetrics(f, fs.readFileSync(abs, 'utf8'));
    if (!isExcludedFromLineLimit(f) && m.lines > MAX_FILE_LINES)
      b.maxLinesOver300[f] = m.lines;
    if (m.explicitAny > 0) b.explicitAny[f] = m.explicitAny;
    if (m.reactFc > 0) b.reactFc.push(f);
    if (m.customEvent > 0) b.customEvent.push(f);
    if (
      m.tacticalSingleton > 0 &&
      !f.includes('src/features/tactical-unified/core/') &&
      f !== 'src/features/tactical-unified/stores/tactical-unified-store.ts' &&
      f !==
        'src/features/tactical-unified/stores/tactical-unified-store-provider.tsx' &&
      f !== 'src/stores/tactical-unified-store.ts'
    ) {
      b.tacticalSingleton.push(f);
    }
    if (m.consoleLog > 0) b.consoleLog.push(f);
    if (m.deepRelativeImport > 0)
      b.deepRelativeImport[f] = m.deepRelativeImport;
    if (m.eslintDisable > 0) b.eslintDisable.push(f);
    if (m.useClientViolation) b.useClientViolations.push(f);
    if (m.isPascalComponent) b.pascalCaseComponents.push(f);
  }
  return b;
}

if (import.meta.main && process.argv.includes('--write-baseline')) {
  const tracked = execSync('git ls-files src extension', { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const b = generateBaselineFromRepo(tracked);
  fs.writeFileSync(
    path.join(process.cwd(), '.agents/guardrails-baseline.json'),
    `${JSON.stringify(b, null, 2)}\n`,
  );
  console.log('✅ Wrote .agents/guardrails-baseline.json');
}
