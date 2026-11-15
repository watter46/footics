import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  hasActiveDirectorCameraTrack,
  type ResolveSyntheticDirectorCameraOptions,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/engine/director-camera';
import {
  type EvaluatedTimelineFrame,
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  type Milliseconds,
  toMilliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_PITCH_APPEARANCE,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
import {
  createPitchCanvasAndContext,
  type PitchCacheEntry,
} from './pitch-cache-helpers';
import {
  _resetSharedOffscreenCanvas,
  getOffscreenCanvas,
} from './renderers/offscreen-canvas-pool';
import { renderPitch } from './renderers/pitch-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from './renderers/renderer-context';
import { rasterizeSceneGraphToCanvas2D } from './scene-graph-canvas2d-rasterizer';
import { calculateBoundaryCrop, isBoundaryCropActive } from './video-crop-calc';

export { _resetSharedOffscreenCanvas };

let pitchCache: PitchCacheEntry | null = null;

export interface RenderTacticalPhaseFrameOptions {
  ctx: AnyCanvasRenderingContext2D;
  phase: DomainTacticalPhase;
  timeMs: Milliseconds | number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox | null;
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
    boundaryBox,
    applyEffects,
  } = options;
  if (w <= 0 || h <= 0) return;

  if (isBoundaryCropActive(boundaryBox)) {
    const canonicalW =
      options.baseWidth ??
      Math.max(1, Math.round(w / Math.max(0.01, boundaryBox.width)));
    const canonicalH =
      options.baseHeight ??
      Math.max(1, Math.round(h / Math.max(0.01, boundaryBox.height)));
    const offscreen = getOffscreenCanvas(canonicalW, canonicalH);
    if (offscreen) {
      renderTacticalPhaseFrameToCanvas({
        ...options,
        ctx: offscreen.ctx,
        width: canonicalW,
        height: canonicalH,
        baseWidth: canonicalW,
        baseHeight: canonicalH,
        boundaryBox: null,
      });
      const crop = calculateBoundaryCrop(
        boundaryBox,
        canonicalW,
        canonicalH,
        1,
      );
      ctx.save();
      ctx.drawImage(
        offscreen.canvas as CanvasImageSource,
        crop.cropX,
        crop.cropY,
        crop.cropW,
        crop.cropH,
        0,
        0,
        w,
        h,
      );
      ctx.restore();
      return;
    }
  }

  const baseWidth = options.baseWidth ?? w;
  const baseHeight = options.baseHeight ?? h;
  const effectiveAspectRatio = options.aspectRatio ?? phase.aspectRatio;
  const transparent = options.transparent ?? false;
  const teamVisibility = options.teamVisibility ?? 'both';

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') ctx.rect(0, 0, w, h);
  if (typeof ctx.clip === 'function') ctx.clip();

  const evaluated = evaluateTimelineFrame(
    phase,
    toMilliseconds(Number(timeMs)),
  );
  const effectiveDirectorCamera =
    options.directorCamera !== undefined
      ? options.directorCamera
      : phase.directorCamera;
  const directorPitchTransform = hasActiveDirectorCameraTrack(
    effectiveDirectorCamera,
  )
    ? resolveSyntheticDirectorCamera(
        effectiveDirectorCamera,
        Number(timeMs),
        options.directorCameraOptions,
      )
    : undefined;

  const effectivePitchTransform =
    options.pitchTransformOverride ??
    options.pitchTransform ??
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
  const cacheKey = `${baseWidth}x${baseHeight}:${effectiveAspectRatio}:${JSON.stringify(options.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(options.marbleTexture)}:${transparent}:${JSON.stringify(options.screenBackground ?? null)}${transformCacheSuffix}`;

  const drawPitchTo = (targetCtx: AnyCanvasRenderingContext2D) => {
    const frameContext = createFrameRenderContext({
      ctx: targetCtx,
      baseWidth,
      baseHeight,
      aspectRatio: effectiveAspectRatio,
      framePitchTransform: effectivePitchTransform,
    });
    renderPitch(
      frameContext,
      effectiveAspectRatio,
      transparent,
      options.pitchAppearance,
      options.marbleTexture,
      options.screenBackground,
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
  if (!pitchDrawn) drawPitchTo(ctx);

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
  if (options.applyEffects === false) {
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
      ...(options.effectTimeMs !== undefined
        ? { timeInSlideMs: options.effectTimeMs }
        : {}),
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
    { width: baseWidth, height: baseHeight },
    prevSlide,
  );
  rasterizeSceneGraphToCanvas2D({
    ctx,
    sceneGraph,
    playerPhotos: options.playerPhotos,
  });
  ctx.restore();
}
