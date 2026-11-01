import * as fs from 'node:fs';
import {
  isExcludedFromLineLimit,
  isScopedSourceFile,
  loadGuardrailsBaseline,
  MAX_FILE_LINES,
  normalizeRepoPath,
} from '../../.agents/scripts/lib/code-guardrails';

const baseline = loadGuardrailsBaseline();

function checkFileSize(filePath: string): boolean {
  const normFile = normalizeRepoPath(filePath);
  if (!isScopedSourceFile(normFile) || isExcludedFromLineLimit(normFile)) {
    return true;
  }

  const file = Bun.file(filePath);
  // Bun.file(filePath).size は高速にバイト数を確認可能
  if (file.size === 0) return true;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').length;
  const limit = baseline.maxLinesOver300[normFile] ?? MAX_FILE_LINES;

  if (lines > limit) {
    console.error(
      `[ERROR] File size limit exceeded: ${normFile} (${lines} lines). Max allowed is ${limit} lines.`,
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

let failedCount = 0;
for (const file of files) {
  if (!checkFileSize(file)) {
    failedCount += 1;
  }
}

if (failedCount > 0) {
  console.error(`${failedCount} file(s) exceeded size limits.`);
  process.exit(1);
}
console.log('All files passed size limits.');
process.exit(0);
