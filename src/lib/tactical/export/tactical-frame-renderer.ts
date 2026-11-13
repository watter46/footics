import {
  getInterpolatedUnifiedSlideFrame,
  type InterpolatedUnifiedFrame,
  type ResolveSyntheticDirectorCameraOptions,
} from '@/lib/tactical/unified-interpolation';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { DirectorCameraTrack } from '@/lib/types/tactical/project';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
import { renderArrows, renderConnectLines } from './renderers/arrow-renderer';
import {
  renderBall,
  SOCCER_BALL_PATCH_PATHS,
  SOCCER_BALL_SEAM_LINES,
} from './renderers/ball-renderer';
import {
  _resetSharedOffscreenCanvas,
  getOffscreenCanvas,
} from './renderers/offscreen-canvas-pool';
import { renderPitch } from './renderers/pitch-renderer';
import { renderPlayers } from './renderers/player-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
  getOpticalCenterX,
  TACTICAL_CANVAS_FONT_FAMILY,
} from './renderers/renderer-context';
import { renderTexts } from './renderers/text-renderer';
import { renderZones } from './renderers/zone-renderer';
import {
  type RasterizeSceneGraphOptions,
  rasterizeSceneGraphToCanvas2D,
} from './scene-graph-canvas2d-rasterizer';
import {
  computeFrameEffects,
  hasActiveFrameEffects,
  isPauseFrame,
} from './tactical-frame-effects';
import {
  type RenderTacticalPhaseFrameOptions,
  renderTacticalPhaseFrameToCanvas,
} from './tactical-phase-frame-renderer';
import { isBoundaryCropActive } from './video-crop-calc';

export {
  _resetSharedOffscreenCanvas,
  type AnyCanvasRenderingContext2D,
  computeFrameEffects,
  getOpticalCenterX,
  hasActiveFrameEffects,
  isPauseFrame,
  type RasterizeSceneGraphOptions,
  type RenderTacticalPhaseFrameOptions,
  rasterizeSceneGraphToCanvas2D,
  renderTacticalPhaseFrameToCanvas,
  SOCCER_BALL_PATCH_PATHS,
  SOCCER_BALL_SEAM_LINES,
  TACTICAL_CANVAS_FONT_FAMILY,
};

export type InterpolatedUnifiedSlideFrame = InterpolatedUnifiedFrame;

export interface RenderTacticalFrameOptions {
  slides: readonly (Slide | DomainSlide)[];
  timeMs: number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  transparent?: boolean;
  mvpMatrix?: Float32Array | null;
  pitchTransformOverride?: PitchTransform | null;
  pitchTransform?: PitchTransform | null;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  teamVisibility?: 'both' | 'home' | 'away';
  precomputedFrame?: InterpolatedUnifiedSlideFrame;
  applyEffects?: boolean;
  effectTimeMs?: number;
  phase?: DomainTacticalPhase;
}

export type RenderTacticalFrameParams = RenderTacticalFrameOptions;

function renderBoundaryCropSlice(
  ctx: AnyCanvasRenderingContext2D,
  options: RenderTacticalFrameOptions,
  boundaryBox: BoundaryBox,
  canonicalW: number,
  canonicalH: number,
): boolean {
  const offscreen = getOffscreenCanvas(canonicalW, canonicalH);
  if (!offscreen || typeof ctx.drawImage !== 'function') return false;

  offscreen.ctx.clearRect?.(0, 0, canonicalW, canonicalH);
  renderTacticalFrameToCanvas(offscreen.ctx, {
    ...options,
    width: canonicalW,
    height: canonicalH,
    baseWidth: canonicalW,
    baseHeight: canonicalH,
    boundaryBox: null,
  });

  const cropX = (boundaryBox.x / 100) * canonicalW;
  const cropY = (boundaryBox.y / 100) * canonicalH;
  const cropW = (boundaryBox.width / 100) * canonicalW;
  const cropH = (boundaryBox.height / 100) * canonicalH;

  ctx.drawImage(
    offscreen.canvas as CanvasImageSource,
    cropX,
    cropY,
    cropW,
    cropH,
    0,
    0,
    options.width,
    options.height,
  );
  return true;
}

export function renderTacticalFrameToCanvas(
  ctx: AnyCanvasRenderingContext2D,
  options: RenderTacticalFrameOptions,
): void {
  const {
    slides,
    timeMs,
    width: w,
    height: h,
    aspectRatio,
    boundaryBox,
    transparent = false,
    mvpMatrix,
    playerPhotos,
    pitchAppearance,
    marbleTexture,
    screenBackground,
    directorCamera,
    directorCameraOptions,
    teamVisibility,
    phase,
  } = options;

  if (w <= 0 || h <= 0) return;

  const isBoundaryActive = isBoundaryCropActive(boundaryBox);
  const canonicalW =
    isBoundaryActive && boundaryBox
      ? (options.baseWidth ??
        Math.round((w * 100) / Math.max(1, boundaryBox.width)))
      : (options.baseWidth ?? w);
  const canonicalH =
    isBoundaryActive && boundaryBox
      ? (options.baseHeight ??
        Math.round((h * 100) / Math.max(1, boundaryBox.height)))
      : (options.baseHeight ?? h);

  if (
    isBoundaryActive &&
    boundaryBox &&
    mvpMatrix == null &&
    renderBoundaryCropSlice(ctx, options, boundaryBox, canonicalW, canonicalH)
  ) {
    return;
  }

  if (
    options.phase != null &&
    mvpMatrix == null &&
    options.precomputedFrame == null
  ) {
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase: options.phase,
      timeMs,
      width: w,
      height: h,
      baseWidth: options.baseWidth,
      baseHeight: options.baseHeight,
      playerPhotos,
      pitchAppearance,
      marbleTexture,
      screenBackground,
      transparent,
      teamVisibility,
      pitchTransform: options.pitchTransform,
      pitchTransformOverride: options.pitchTransformOverride,
      directorCamera,
      directorCameraOptions,
      applyEffects: options.applyEffects,
      effectTimeMs: options.effectTimeMs,
    });
    return;
  }

  const baseWidth = isBoundaryActive ? canonicalW : w;
  const baseHeight = isBoundaryActive ? canonicalH : h;

  ctx.save();
  ctx.beginPath();
  if (typeof ctx.rect === 'function') ctx.rect(0, 0, w, h);
  if (typeof ctx.clip === 'function') ctx.clip();

  if (isBoundaryActive && boundaryBox && typeof ctx.translate === 'function') {
    ctx.translate(
      -(boundaryBox.x / 100) * canonicalW,
      -(boundaryBox.y / 100) * canonicalH,
    );
  }

  const frame =
    options.precomputedFrame ??
    getInterpolatedUnifiedSlideFrame(
      slides,
      timeMs,
      directorCamera,
      directorCameraOptions,
    );

  const frameContext = createFrameRenderContext({
    ctx,
    baseWidth,
    baseHeight,
    aspectRatio,
    mvpMatrix,
    pitchTransformOverride:
      options.pitchTransformOverride ?? options.pitchTransform,
    framePitchTransform: frame.pitchTransform,
  });

  renderPitch(
    frameContext,
    aspectRatio,
    transparent,
    pitchAppearance,
    marbleTexture,
    screenBackground,
  );

  const baseDim = frameContext.outerPitchRect
    ? Math.min(
        frameContext.outerPitchRect.width,
        frameContext.outerPitchRect.height,
      )
    : Math.min(baseWidth, baseHeight);

  const { effectArrows, effectZones, playerRings, timeInSlideMs } =
    computeFrameEffects(
      slides,
      timeMs,
      frame.arrows,
      frame.players,
      frame.nextSlideIndex,
      baseDim,
      {
        applyEffects: options.applyEffects,
        effectTimeOverrideMs: options.effectTimeMs,
        zones: frame.zones,
      },
    );
  frameContext.timeInSlideMs = timeInSlideMs;

  renderZones(frameContext, effectZones, timeInSlideMs);
  renderConnectLines(frameContext, frame.players);
  renderArrows(frameContext, effectArrows, frame.players);
  renderPlayers(
    frameContext,
    frame.players,
    playerPhotos,
    teamVisibility,
    playerRings,
    options.applyEffects === false ? undefined : timeInSlideMs,
  );
  renderBall(frameContext, frame.ball);
  renderTexts(frameContext, frame.texts);

  ctx.restore();
}
