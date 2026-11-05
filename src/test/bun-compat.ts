// @ts-nocheck
import './dom-preload';
import './setup';
import { mock, spyOn } from 'bun:test';
import * as vitest from 'vitest';

// Vitest の vi オブジェクト互換レイヤー
const viCompat = {
  fn: mock,
  spyOn: spyOn,
  mocked: (fn: unknown) => fn,
  stubGlobal: (key: string, value: unknown) => {
    (globalThis as Record<string, unknown>)[key] = value;
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>)[key] = value;
    }
  },
  unstubAllGlobals: () => {},
  restoreAllMocks: () => {},
  clearAllMocks: () => {},
  resetAllMocks: () => {},
};

if (typeof (globalThis as Record<string, unknown>).vi === 'undefined') {
  (globalThis as Record<string, unknown>).vi = viCompat;
}

if ((vitest as Record<string, unknown>).vi) {
  Object.assign((vitest as Record<string, unknown>).vi as object, viCompat);
}
