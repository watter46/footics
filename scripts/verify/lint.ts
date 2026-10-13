import { execSync } from 'node:child_process';
import * as fs from 'node:fs';

const args = process.argv.slice(2);
const isFix = args.includes('--fix') || args.includes('--write');
const targetPaths = args.filter((a) => !a.startsWith('-'));

let filesToCheck = targetPaths;

if (filesToCheck.length === 0) {
  try {
    const status = execSync('git status --porcelain -uall', {
      encoding: 'utf8',
    });
    const changed = status
      .split('\n')
      .filter((l) => l.length > 3 && !l.startsWith(' D') && !l.startsWith('D '))
      .map((l) => l.slice(3).split(' -> ').pop() ?? '')
      .map((p) => p.replace(/^"|"$/g, ''))
      .filter(
        (p) =>
          fs.existsSync(p) &&
          /\.(jsx?|tsx?|jsonc?|css)$/.test(p) &&
          !p.startsWith('.agents/plugins/'),
      );
    if (changed.length > 0) {
      filesToCheck = changed;
    }
  } catch (_e) {
    // git status failed or not in repo
  }
}

if (filesToCheck.length === 0) {
  console.log('Biome: No changed files found. Scoped lint skipped.');
  console.log(
    "[HINT] To check specific files, run 'bun run lint <path>'. To check the entire codebase, run 'bun run lint:all'.",
  );
  process.exit(0);
}

const target = filesToCheck.map((f) => `"${f}"`).join(' ');
const action = isFix ? 'check --write' : 'check';
const cmd = `./node_modules/.bin/biome ${action} --diagnostic-level=warn --reporter=concise ${target}`;
console.log(`> ${cmd}`);
try {
  execSync(cmd, { stdio: 'inherit' });
} catch (e: unknown) {
  const exitCode =
    typeof e === 'object' &&
    e !== null &&
    'status' in e &&
    typeof e.status === 'number'
      ? e.status
      : 1;
  process.exit(exitCode);
}
