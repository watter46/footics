import {
  type PitchNormPoint,
  type ScreenNormPoint,
  type StagePixelPoint,
  toPitchNormPoint,
  toScreenNormPoint,
  toStagePixelPoint,
} from '@/lib/types/tactical/branded';

export interface StageViewport {
  readonly width: number;
  readonly height: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
}

export interface PitchFrameBoundsNorm {
  readonly left: number; // default 6
  readonly top: number; // default 6
  readonly width: number; // default 88
  readonly height: number; // default 88
}

export const DEFAULT_PITCH_FRAME_BOUNDS: PitchFrameBoundsNorm = {
  left: 6,
  top: 6,
  width: 88,
  height: 88,
};

export function pitchNormToScreenNorm(
  pt: PitchNormPoint,
  bounds: PitchFrameBoundsNorm = DEFAULT_PITCH_FRAME_BOUNDS,
): ScreenNormPoint {
  return toScreenNormPoint(
    bounds.left + (pt.x / 100) * bounds.width,
    bounds.top + (pt.y / 100) * bounds.height,
  );
}

export function screenNormToPitchNorm(
  pt: ScreenNormPoint,
  bounds: PitchFrameBoundsNorm = DEFAULT_PITCH_FRAME_BOUNDS,
): PitchNormPoint {
  const rawX =
    bounds.width > 0 ? ((pt.x - bounds.left) / bounds.width) * 100 : 50;
  const rawY =
    bounds.height > 0 ? ((pt.y - bounds.top) / bounds.height) * 100 : 50;
  return toPitchNormPoint(rawX, rawY);
}

export function screenNormToStagePixel(
  pt: ScreenNormPoint,
  viewport: StageViewport,
): StagePixelPoint {
  const ox = viewport.offsetX ?? 0;
  const oy = viewport.offsetY ?? 0;
  return toStagePixelPoint(
    ox + (pt.x / 100) * viewport.width,
    oy + (pt.y / 100) * viewport.height,
  );
}

export function stagePixelToScreenNorm(
  pt: StagePixelPoint,
  viewport: StageViewport,
  clamp = true,
): ScreenNormPoint {
  const ox = viewport.offsetX ?? 0;
  const oy = viewport.offsetY ?? 0;
  const rawX = viewport.width > 0 ? ((pt.x - ox) / viewport.width) * 100 : 50;
  const rawY = viewport.height > 0 ? ((pt.y - oy) / viewport.height) * 100 : 50;
  return toScreenNormPoint(rawX, rawY, clamp);
}
