import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// 各テストの後に DOM をクリーンアップする
afterEach(() => {
  cleanup();
});
