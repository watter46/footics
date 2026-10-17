import * as fs from 'fs';
import * as path from 'path';

const LIMITS = {
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
    // If it's a tsx file, it's likely a component
    if (base.endsWith('.tsx')) return 'component';
  }
  if (base.startsWith('use') && base.endsWith('.ts')) return 'hook';
  if (filePath.includes('stores/') || base.includes('store')) return 'store';
  return null;
}

function checkFileSize(filePath: string) {
  const category = getCategory(filePath);
  if (!category) return true; // not restricted by these rules

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const limit = LIMITS[category];

  if (lines > limit) {
    console.warn(
      `[WARN] File size limit exceeded: ${filePath} (${lines} lines). Max allowed for ${category} is ${limit} lines.`,
    );
    return false;
  }
  return true;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error(
    'Usage: bun scripts/lint/check-file-size.ts <file1> <file2> ...',
  );
  process.exit(1);
}

let warnedCount = 0;
for (const file of files) {
  if (!checkFileSize(file)) {
    warnedCount += 1;
  }
}

if (warnedCount > 0) {
  console.log(
    `${warnedCount} file(s) exceeded recommended size limits (warn only).`,
  );
} else {
  console.log('All files passed size limits.');
}
process.exit(0);
