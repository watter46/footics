import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import type { Milliseconds } from '@/lib/types/tactical/branded';
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
import { renderPitch } from './renderers/pitch-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from './renderers/renderer-context';
import { rasterizeSceneGraphToCanvas2D } from './scene-graph-canvas2d-rasterizer';

interface PitchCacheEntry {
  key: string;
  canvas: OffscreenCanvas | HTMLCanvasElement;
}

let pitchCache: PitchCacheEntry | null = null;

function wrapContextSafe(
  ctx: AnyCanvasRenderingContext2D,
): AnyCanvasRenderingContext2D {
  return new Proxy(ctx, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'function') {
        return (val as (...args: unknown[]) => unknown).bind(target);
      }
      if (val === undefined && typeof prop === 'string') {
        return () => {};
      }
      return val;
    },
  });
}

function createPitchCanvasAndContext(
  width: number,
  height: number,
): {
  canvas: OffscreenCanvas | HTMLCanvasElement;
  ctx: AnyCanvasRenderingContext2D;
} | null {
  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      const offscreen = new OffscreenCanvas(width, height);
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        return {
          canvas: offscreen,
          ctx: wrapContextSafe(ctx as AnyCanvasRenderingContext2D),
        };
      }
    } catch {
      // ignore and fallback
    }
  }
  if (
    typeof document !== 'undefined' &&
    typeof document.createElement === 'function'
  ) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        return {
          canvas,
          ctx: wrapContextSafe(ctx as AnyCanvasRenderingContext2D),
        };
      }
    } catch {
      // ignore
    }
  }
  return null;
}

export interface RenderTacticalPhaseFrameOptions {
  ctx: AnyCanvasRenderingContext2D;
  phase: DomainTacticalPhase;
  timeMs: Milliseconds | number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  transparent?: boolean;
}

export function renderTacticalPhaseFrameToCanvas(
  options: RenderTacticalPhaseFrameOptions,
): void {
  const {
    ctx,
    phase,
    timeMs,
    width: w,
    height: h,
    playerPhotos,
    pitchAppearance,
    marbleTexture,
    screenBackground,
    transparent = false,
  } = options;

  if (w <= 0 || h <= 0) return;
  const baseWidth = options.baseWidth ?? w;
  const baseHeight = options.baseHeight ?? h;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') ctx.rect(0, 0, w, h);
  if (typeof ctx.clip === 'function') ctx.clip();

  const cacheKey = `${baseWidth}x${baseHeight}:${phase.aspectRatio}:${JSON.stringify(pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(marbleTexture)}`;

  let pitchDrawn = false;
  if (pitchCache && pitchCache.key === cacheKey) {
    ctx.drawImage(
      pitchCache.canvas as CanvasImageSource,
      0,
      0,
      baseWidth,
      baseHeight,
    );
    pitchDrawn = true;
  } else {
    const created = createPitchCanvasAndContext(baseWidth, baseHeight);

    if (created) {
      const { canvas: cacheCanvas, ctx: cacheCtx } = created;
      const frameContext = createFrameRenderContext({
        ctx: cacheCtx,
        baseWidth,
        baseHeight,
        aspectRatio: phase.aspectRatio,
      });
      renderPitch(
        frameContext,
        phase.aspectRatio,
        transparent,
        pitchAppearance,
        marbleTexture,
        screenBackground,
      );
      pitchCache = { key: cacheKey, canvas: cacheCanvas };
      ctx.drawImage(
        cacheCanvas as CanvasImageSource,
        0,
        0,
        baseWidth,
        baseHeight,
      );
      pitchDrawn = true;
    }
  }

  if (!pitchDrawn) {
    const frameContext = createFrameRenderContext({
      ctx,
      baseWidth,
      baseHeight,
      aspectRatio: phase.aspectRatio,
    });
    renderPitch(
      frameContext,
      phase.aspectRatio,
      transparent,
      pitchAppearance,
      marbleTexture,
      screenBackground,
    );
  }

  const evaluated = evaluateTimelineFrame(phase, timeMs as Milliseconds);
  const prevSlide =
    phase.slides.length > 0
      ? phase.slides[Math.max(0, evaluated.slideIndex - 1)]
      : null;
  const sceneGraph = compileSceneGraph(
    evaluated,
    null,
    {
      width: baseWidth,
      height: baseHeight,
    },
    prevSlide,
  );
  rasterizeSceneGraphToCanvas2D({ ctx, sceneGraph, playerPhotos });
  ctx.restore();
}
