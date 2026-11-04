import type { AnyCanvasRenderingContext2D } from './renderer-context';

/** モジュールスコープで再利用する2段階クロップ用オフスクリーンキャンバス */
let sharedOffscreenCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

export function _resetSharedOffscreenCanvas(): void {
  sharedOffscreenCanvas = null;
}

export function isComplete2DContext(
  ctx: unknown,
): ctx is AnyCanvasRenderingContext2D {
  if (typeof ctx !== 'object' || ctx === null) return false;
  const c = ctx as Record<string, unknown>;
  return typeof c.fillRect === 'function' && typeof c.strokeRect === 'function';
}

export function getOffscreenCanvas(
  width: number,
  height: number,
): {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  ctx: AnyCanvasRenderingContext2D;
} | null {
  try {
    let canvas = sharedOffscreenCanvas;
    let offscreenCtx = canvas
      ? (canvas.getContext('2d') as AnyCanvasRenderingContext2D | null)
      : null;

    if (!canvas || !isComplete2DContext(offscreenCtx)) {
      if (
        typeof document !== 'undefined' &&
        typeof document.createElement === 'function'
      ) {
        canvas = document.createElement('canvas');
      } else if (typeof OffscreenCanvas !== 'undefined') {
        canvas = new OffscreenCanvas(width, height);
      } else {
        canvas = null;
      }

      if (!canvas) {
        sharedOffscreenCanvas = null;
        return null;
      }

      offscreenCtx = canvas.getContext(
        '2d',
      ) as AnyCanvasRenderingContext2D | null;
      if (!isComplete2DContext(offscreenCtx)) {
        sharedOffscreenCanvas = null;
        return null;
      }
      sharedOffscreenCanvas = canvas;
    }

    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    return { canvas, ctx: offscreenCtx };
  } catch {
    sharedOffscreenCanvas = null;
    return null;
  }
}
