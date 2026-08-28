const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

function getChangedTsFiles() {
  try {
    const status = execSync('git status -s', { stdio: 'pipe' }).toString();
    return status
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[1])
      .filter(
        (file) =>
          file &&
          /\.(ts|tsx)$/.test(file) &&
          !file.endsWith('.d.ts') &&
          fs.existsSync(file),
      );
  } catch (_e) {
    return [];
  }
}

function runScopedTypeCheck(files) {
  const targetFiles = files.length > 0 ? files : getChangedTsFiles();

  if (targetFiles.length === 0) {
    console.log('TypeScript: No TypeScript files to check.');
    return;
  }

  // Separate files by workspace/root
  const rootFiles = [];
  const extensionFiles = [];
  const videoCanvasFiles = [];

  for (const file of targetFiles) {
    if (file.startsWith('extension/')) {
      extensionFiles.push(file.replace(/^extension\//, ''));
    } else if (file.startsWith('video-canvas/')) {
      videoCanvasFiles.push(file.replace(/^video-canvas\//, ''));
    } else {
      rootFiles.push(file);
    }
  }

  // 1. Root / Web App Check
  if (rootFiles.length > 0) {
    const tempConfigPath = path.join(
      process.cwd(),
      '.tsconfig.scoped.tmp.json',
    );
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
      execSync(`rtk tsc --noEmit -p ${tempConfigPath}`, { stdio: 'inherit' });
    } finally {
      if (fs.existsSync(tempConfigPath)) {
        fs.unlinkSync(tempConfigPath);
      }
    }
  }

  // 2. Extension Check
  if (extensionFiles.length > 0) {
    execSync('cd extension && rtk tsc --noEmit', { stdio: 'inherit' });
  }

  // 3. Video Canvas Check
  if (videoCanvasFiles.length > 0) {
    execSync('cd video-canvas && rtk tsc --noEmit', { stdio: 'inherit' });
  }
}

const args = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
try {
  runScopedTypeCheck(args);
} catch (e) {
  process.exit(e.status || 1);
}
