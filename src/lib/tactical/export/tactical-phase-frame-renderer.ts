import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
import type { Milliseconds } from '@/lib/types/tactical/branded';
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import type {
  PitchAppearanceConfig,
  ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
import { renderPitch } from './renderers/pitch-renderer';
import {
  type AnyCanvasRenderingContext2D,
  createFrameRenderContext,
} from './renderers/renderer-context';
import { rasterizeSceneGraphToCanvas2D } from './scene-graph-canvas2d-rasterizer';

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

  const evaluated = evaluateTimelineFrame(phase, timeMs as Milliseconds);
  const sceneGraph = compileSceneGraph(evaluated, null, {
    width: baseWidth,
    height: baseHeight,
  });
  rasterizeSceneGraphToCanvas2D({ ctx, sceneGraph, playerPhotos });
  ctx.restore();
}
