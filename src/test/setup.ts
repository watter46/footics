import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Happy-DOM の Blob は Node.js の structuredClone でプロトタイプが失われるため
// fake-indexeddb 用に Blob を保護する structuredClone パッチを適用
const originalStructuredClone = globalThis.structuredClone;
function safeClone<T>(val: T): T {
  if (val === null || typeof val !== 'object') return val;
  if (val instanceof Blob) return val;
  if (Array.isArray(val)) return val.map(safeClone) as unknown as T;
  const copy: any = {};
  for (const key of Object.keys(val)) {
    copy[key] = safeClone((val as any)[key]);
  }
  return copy;
}
globalThis.structuredClone = (val: any) => safeClone(val);

// 各テストの後に DOM をクリーンアップする
afterEach(() => {
  cleanup();
});
