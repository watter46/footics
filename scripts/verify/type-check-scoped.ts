import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function getChangedTsFiles(): string[] {
  try {
    const status = execSync('git status -s', { stdio: 'pipe' }).toString();
    return status
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
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
        '.next/types/**/*.ts',
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

export function runScopedTypeCheck(files: string[] = []): void {
  const targetFiles =
    files.length > 0
      ? files.filter(
          (f) =>
            /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts') && fs.existsSync(f),
        )
      : getChangedTsFiles();

  if (targetFiles.length === 0) {
    console.log('TypeScript: No TypeScript files to check. Skipping.');
    return;
  }

  console.log(`TypeScript: Checking ${targetFiles.length} scoped file(s)...`);

  const rootFiles = targetFiles.filter(
    (f) => !f.startsWith('extension/') && !f.startsWith('video-canvas/'),
  );
  checkRoot(rootFiles);
}

// CLI direct execution
const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
try {
  runScopedTypeCheck(args);
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
