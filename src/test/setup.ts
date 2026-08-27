import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Happy-DOM の Blob は Node.js の structuredClone でプロトタイプが失われるため
// fake-indexeddb 用に Blob を保護する structuredClone パッチを適用
const _originalStructuredClone = globalThis.structuredClone;
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

// Canvas 2D context mock for Konva in happy-dom
if (typeof window !== 'undefined' && typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((contextId: string) => {
    if (contextId === '2d') {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({ data: new Array(4) }),
        putImageData: () => {},
        createImageData: () => [],
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        fillText: () => {},
        strokeText: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
        measureText: () => ({ width: 0 }),
        transform: () => {},
        rect: () => {},
        clip: () => {},
        setLineDash: () => {},
        getLineDash: () => [],
        isPointInPath: () => true,
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        createPattern: () => null,
      } as unknown as CanvasRenderingContext2D;
    }
    return null;
  }) as any;
}

// 各テストの後に DOM をクリーンアップする
afterEach(() => {
  cleanup();
});
