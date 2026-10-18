import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';

/**
 * TDD RED 専用超高速チェッカー
 *
 * 目的:
 * TDD の RED サイクル（テスト失敗の確認）において、
 * 型チェックや Biome などの重い検証を完全バイパスし、0.5秒で判定する。
 *
 * 判定ロジック:
 * - 指定されたテストファイルに対して Vitest を単独実行。
 * - テストが 1件以上「失敗（RED）」していれば exit code 0（成功）を返す。
 * - テストが全て PASS（GREEN）してしまった場合は exit code 1（失敗）を返す。
 */

const args = process.argv.slice(2).filter((a) => !a.startsWith('-'));

if (args.length === 0) {
  console.error(
    '❌ Please specify a test file to run (e.g. bun run ai:check:red src/foo.test.ts)',
  );
  process.exit(1);
}

for (const f of args) {
  if (!fs.existsSync(f)) {
    console.error(`❌ Test file not found: ${f}`);
    process.exit(1);
  }
}

const fileArgs = args.map((f) => `"${f}"`).join(' ');
console.log(`🧪 Running fast TDD RED check on: ${fileArgs}\n`);

const vitestBin = './node_modules/.bin/vitest';
const child = spawnSync(
  vitestBin,
  ['run', ...args, '--reporter=default', '--no-color'],
  {
    encoding: 'utf8',
    stdio: 'pipe',
  },
);

const stdout = child.stdout || '';
const stderr = child.stderr || '';
const combined = `${stdout}\n${stderr}`;

// Vitest の出力を表示
console.log(combined);

// 1. テストが見つからない、または実行不能な場合のハンドリング
const noTestsFound =
  /No test files found/i.test(combined) ||
  /No test suites found/i.test(combined);

if (noTestsFound) {
  console.error('\n❌ RED Check Failed: No test files matched or found.');
  process.exit(1);
}

// 2. テストが全て PASS（GREEN）してしまった場合は exit 1
const allPassed =
  /Tests\s+\d+\s+passed/i.test(combined) &&
  !/failed/i.test(combined) &&
  child.status === 0;

if (allPassed) {
  console.error(
    '\n❌ RED Check Failed: All tests passed! You must write a failing test first.',
  );
  process.exit(1);
}

// 3. テストが 1件以上失敗（RED）している場合は exit 0
const hasFailedTests =
  (/Tests\s+.*failed/i.test(combined) || /FAIL\s+/i.test(combined)) &&
  child.status === 1;

if (hasFailedTests) {
  console.log(
    '\n✅ RED Check Passed: Test failed as expected (Ready for GREEN implementation).',
  );
  process.exit(0);
}

console.error(
  '\n❌ RED Check Failed: No runnable tests detected or execution errored unexpectedly.',
);
process.exit(1);
