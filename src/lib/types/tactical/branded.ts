import { z } from 'zod';

export type ScreenNormCoord = number & { readonly __brand: 'ScreenNormCoord' };
export type PitchNormCoord = number & { readonly __brand: 'PitchNormCoord' };
export type StagePixel = number & { readonly __brand: 'StagePixel' };
export type Milliseconds = number & { readonly __brand: 'Milliseconds' };

export interface ScreenNormPoint {
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}

export interface PitchNormPoint {
  readonly x: PitchNormCoord;
  readonly y: PitchNormCoord;
}

export interface StagePixelPoint {
  readonly x: StagePixel;
  readonly y: StagePixel;
}

export const SCREEN_NORM_MIN = -15;
export const SCREEN_NORM_MAX = 115;

export function clampToScreenNorm(
  val: number,
  min: number = SCREEN_NORM_MIN,
  max: number = SCREEN_NORM_MAX,
): ScreenNormCoord {
  const safe = Number.isFinite(val) ? val : 50;
  return Math.max(min, Math.min(max, safe)) as ScreenNormCoord;
}

export function toScreenNormCoord(val: number): ScreenNormCoord {
  return (Number.isFinite(val) ? val : 0) as ScreenNormCoord;
}

export function toPitchNormCoord(val: number): PitchNormCoord {
  const safe = Number.isFinite(val) ? val : 50;
  return Math.max(0, Math.min(100, safe)) as PitchNormCoord;
}

export function toStagePixel(val: number): StagePixel {
  return (Number.isFinite(val) ? val : 0) as StagePixel;
}

export function toMilliseconds(val: number): Milliseconds {
  return Math.max(0, Number.isFinite(val) ? val : 0) as Milliseconds;
}

export function toScreenNormPoint(
  x: number,
  y: number,
  clamp = true,
): ScreenNormPoint {
  return {
    x: clamp ? clampToScreenNorm(x) : toScreenNormCoord(x),
    y: clamp ? clampToScreenNorm(y) : toScreenNormCoord(y),
  };
}

export function toPitchNormPoint(x: number, y: number): PitchNormPoint {
  return { x: toPitchNormCoord(x), y: toPitchNormCoord(y) };
}

export function toStagePixelPoint(x: number, y: number): StagePixelPoint {
  return { x: toStagePixel(x), y: toStagePixel(y) };
}

export const ScreenNormCoordSchema = z
  .number()
  .transform((v) => clampToScreenNorm(v));

export const UnclampedScreenNormCoordSchema = z
  .number()
  .transform((v) => toScreenNormCoord(v));

export const ScreenNormPointSchema = z.object({
  x: ScreenNormCoordSchema,
  y: ScreenNormCoordSchema,
});
