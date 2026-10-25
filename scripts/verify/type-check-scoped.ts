import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getChangedTsFiles(): string[] {
  try {
    const status = execSync('git status --porcelain -uall', {
      encoding: 'utf8',
    });
    return status
      .split('\n')
      .filter((l) => l.length > 3 && !l.startsWith(' D') && !l.startsWith('D '))
      .map((l) => l.slice(3).split(' -> ').pop() ?? '')
      .map((p) => p.replace(/^"|"$/g, ''))
      .filter(
        (file): file is string =>
          Boolean(file) &&
          /\.(ts|tsx)$/.test(file) &&
          !file.endsWith('.d.ts') &&
          fs.existsSync(file),
      );
  } catch (_e) {
    return [];
  }
}

function checkRoot(rootFiles: string[]): void {
  if (rootFiles.length === 0) return;
  const tempConfigPath = path.join(process.cwd(), '.tsconfig.scoped.tmp.json');
  try {
    const baseConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
    const scopedConfig = {
      ...baseConfig,
      compilerOptions: {
        ...baseConfig.compilerOptions,
        noEmit: true,
      },
      include: [
        'next-env.d.ts',
        '.next/types/**/*.d.ts',
        'src/types/**/*.d.ts',
        ...rootFiles,
      ],
    };
    fs.writeFileSync(tempConfigPath, JSON.stringify(scopedConfig, null, 2));
    execSync(`rtk tsc --noEmit --pretty false -p ${tempConfigPath}`, {
      stdio: 'inherit',
    });
  } finally {
    if (fs.existsSync(tempConfigPath)) {
      fs.unlinkSync(tempConfigPath);
    }
  }
}

function checkExtension(extFiles: string[]): void {
  if (extFiles.length === 0) return;
  console.log(`TypeScript (Extension): Checking ${extFiles.length} file(s)...`);
  execSync('rtk tsc --noEmit --pretty false -p extension/tsconfig.json', {
    stdio: 'inherit',
  });
}

function checkProjectWide(): void {
  console.log(
    'TypeScript: Checking project-wide ripple effects (incremental)...',
  );
  execSync('rtk tsc --noEmit --pretty false', {
    stdio: 'inherit',
  });
}

export function runScopedTypeCheck(
  files: string[] = [],
  options: { skipProjectWide?: boolean } = {},
): void {
  const targetFiles =
    files.length > 0
      ? files.filter(
          (f) =>
            /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && fs.existsSync(f),
        )
      : getChangedTsFiles();

  if (targetFiles.length === 0) {
    console.log(
      'TypeScript: No changed TypeScript files. Scoped check skipped.',
    );
    return;
  }

  console.log(`TypeScript: Checking ${targetFiles.length} scoped file(s)...`);

  const rootFiles = targetFiles.filter(
    (f) =>
      (f.startsWith('src/') || f.startsWith('tests/')) &&
      !f.startsWith('extension/') &&
      !f.startsWith('video-canvas/'),
  );
  const extFiles = targetFiles.filter((f) => f.startsWith('extension/'));

  if (rootFiles.length > 0) {
    checkRoot(rootFiles);
    if (!options.skipProjectWide) {
      checkProjectWide();
    }
  }
  if (extFiles.length > 0) {
    checkExtension(extFiles);
  }

  if (rootFiles.length === 0 && extFiles.length === 0) {
    console.log('TypeScript: No app or extension TypeScript files to check.');
  }
}

// CLI direct execution
const rawArgs = process.argv.slice(2);
const skipProjectWide = rawArgs.includes('--scoped-only');
const args = rawArgs.filter((arg) => !arg.startsWith('-'));
try {
  runScopedTypeCheck(args, { skipProjectWide });
} catch (e) {
  const exitCode =
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    typeof e.status === 'number'
      ? e.status
      : 1;
  process.exit(exitCode);
}
