import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  type EvaluatedTimelineFrame,
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  hasActiveDirectorCameraTrack,
  type ResolveSyntheticDirectorCameraOptions,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/interpolation-camera';
import {
  type Milliseconds,
  toMilliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_PITCH_APPEARANCE,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
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
  teamVisibility?: 'both' | 'home' | 'away';
  pitchTransform?: PitchTransform | null;
  pitchTransformOverride?: PitchTransform | null;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  applyEffects?: boolean;
  effectTimeMs?: number;
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
    teamVisibility = 'both',
    pitchTransform,
    pitchTransformOverride,
    directorCamera,
    directorCameraOptions,
    applyEffects,
    effectTimeMs,
  } = options;

  if (w <= 0 || h <= 0) return;
  const baseWidth = options.baseWidth ?? w;
  const baseHeight = options.baseHeight ?? h;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') ctx.rect(0, 0, w, h);
  if (typeof ctx.clip === 'function') ctx.clip();

  const evaluated = evaluateTimelineFrame(
    phase,
    toMilliseconds(Number(timeMs)),
  );

  const effectiveDirectorCamera =
    directorCamera !== undefined ? directorCamera : phase.directorCamera;
  const directorPitchTransform = hasActiveDirectorCameraTrack(
    effectiveDirectorCamera,
  )
    ? resolveSyntheticDirectorCamera(
        effectiveDirectorCamera,
        Number(timeMs),
        directorCameraOptions,
      )
    : undefined;

  const effectivePitchTransform =
    pitchTransformOverride ??
    pitchTransform ??
    directorPitchTransform ??
    evaluated.slide.pitchTransform;

  const hasNonIdentityTransform = Boolean(
    effectivePitchTransform &&
      (effectivePitchTransform.zoom !== 1 ||
        effectivePitchTransform.panX !== 0 ||
        effectivePitchTransform.panY !== 0 ||
        effectivePitchTransform.tilt !== 0 ||
        (effectivePitchTransform.yaw !== undefined &&
          effectivePitchTransform.yaw !== 90)),
  );

  const transformCacheSuffix = hasNonIdentityTransform
    ? `:${JSON.stringify(effectivePitchTransform)}`
    : '';
  const cacheKey = `${baseWidth}x${baseHeight}:${phase.aspectRatio}:${JSON.stringify(pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(marbleTexture)}:${transparent}${transformCacheSuffix}`;

  const drawPitchTo = (targetCtx: AnyCanvasRenderingContext2D) => {
    const frameContext = createFrameRenderContext({
      ctx: targetCtx,
      baseWidth,
      baseHeight,
      aspectRatio: phase.aspectRatio,
      framePitchTransform: effectivePitchTransform,
    });
    renderPitch(
      frameContext,
      phase.aspectRatio,
      transparent,
      pitchAppearance,
      marbleTexture,
      screenBackground,
    );
  };

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
      drawPitchTo(created.ctx);
      pitchCache = { key: cacheKey, canvas: created.canvas };
      ctx.drawImage(
        created.canvas as CanvasImageSource,
        0,
        0,
        baseWidth,
        baseHeight,
      );
      pitchDrawn = true;
    }
  }

  if (!pitchDrawn) {
    drawPitchTo(ctx);
  }

  let players = evaluated.slide.players;
  if (teamVisibility === 'home' || teamVisibility === 'away') {
    players = players.filter(
      (p) =>
        !(
          p.area === 'pitch' &&
          p.team !== teamVisibility &&
          p.team !== 'neutral'
        ),
    );
  }

  const slideToCompile: DomainSlide = {
    ...evaluated.slide,
    ...(effectivePitchTransform !== undefined
      ? { pitchTransform: effectivePitchTransform ?? undefined }
      : {}),
    players,
  };

  let frameToCompile: EvaluatedTimelineFrame;
  if (applyEffects === false) {
    const staticMaps = evaluateStaticSlideFrame(
      slideToCompile,
      evaluated.slideIndex,
    );
    frameToCompile = {
      ...evaluated,
      timeInSlideMs: 0,
      slide: slideToCompile,
      arrowProgressMap: staticMaps.arrowProgressMap,
      zoneOpacityMap: staticMaps.zoneOpacityMap,
    };
  } else {
    frameToCompile = {
      ...evaluated,
      ...(effectTimeMs !== undefined ? { timeInSlideMs: effectTimeMs } : {}),
      slide: slideToCompile,
    };
  }

  const prevSlide =
    phase.slides.length > 0
      ? phase.slides[Math.max(0, evaluated.slideIndex - 1)]
      : null;
  const sceneGraph = compileSceneGraph(
    frameToCompile,
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
