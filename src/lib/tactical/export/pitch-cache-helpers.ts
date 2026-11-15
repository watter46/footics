import type { AnyCanvasRenderingContext2D } from './renderers/renderer-context';

export interface PitchCacheEntry {
  key: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
}

export function wrapContextSafe(
  ctx: AnyCanvasRenderingContext2D,
): AnyCanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop) {
      const val = Reflect.get(target, prop, target);
      if (typeof val === 'function')
        return (val as (...args: unknown[]) => unknown).bind(target);
      return val === undefined && typeof prop === 'string' ? () => {} : val;
    },
    set(target, prop, value) {
      return Reflect.set(target, prop, value, target);
    },
  });
}

export function createPitchCanvasAndContext(
  width: number,
  height: number,
): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: AnyCanvasRenderingContext2D;
} | null {
  try {
    if (typeof OffscreenCanvas !== 'undefined') {
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      if (ctx)
        return {
          canvas: offscreen,
          ctx: wrapContextSafe(ctx as AnyCanvasRenderingContext2D),
        };
    }
  } catch {
    /* ignore */
  }
  try {
    if (
      typeof document !== 'undefined' &&
      typeof document.createElement === 'function'
    ) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx)
        return {
          canvas,
          ctx: wrapContextSafe(ctx as AnyCanvasRenderingContext2D),
        };
    }
  } catch {
    /* ignore */
  }
  return null;
}
