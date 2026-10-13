import * as fs from 'fs';
import * as path from 'path';

const LIMITS = {
  component: 300,
  hook: 150,
  store: 200,
};

function getCategory(filePath: string): 'component' | 'hook' | 'store' | null {
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
    console.error(
      `[ERROR] File size limit exceeded: ${filePath} (${lines} lines). Max allowed for ${category} is ${limit} lines.`,
    );
    return false;
  }
  return true;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error(
    'Usage: tsx scripts/lint/check-file-size.ts <file1> <file2> ...',
  );
  process.exit(1);
}

let allPassed = true;
for (const file of files) {
  if (!checkFileSize(file)) {
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('All files passed size limits.');
}
