import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  SCREEN_NORM_MAX,
  SCREEN_NORM_MIN,
  ScreenNormCoordSchema,
  ScreenNormPointSchema,
  toMilliseconds,
  toPitchNormCoord,
  toPitchNormPoint,
  toScreenNormCoord,
  toScreenNormPoint,
  toStagePixel,
  toStagePixelPoint,
  UnclampedScreenNormCoordSchema,
} from '../../types/tactical/branded';
import {
  DEFAULT_PITCH_FRAME_BOUNDS,
  pitchNormToScreenNorm,
  type StageViewport,
  screenNormToPitchNorm,
  screenNormToStagePixel,
  stagePixelToScreenNorm,
} from '../engine/coordinates';

describe('Branded Coordinates & Smart Constructors', () => {
  describe('clampToScreenNorm', () => {
    it('clamps values above max and below min, falling back to 50 for NaN', () => {
      expect(clampToScreenNorm(150)).toBe(SCREEN_NORM_MAX);
      expect(clampToScreenNorm(-30)).toBe(SCREEN_NORM_MIN);
      expect(clampToScreenNorm(Number.NaN)).toBe(50);
      expect(clampToScreenNorm(50)).toBe(50);
    });

    it('respects custom min and max bounds', () => {
      expect(clampToScreenNorm(10, 0, 5)).toBe(5);
      expect(clampToScreenNorm(-5, 0, 5)).toBe(0);
    });
  });

  describe('Smart Constructors', () => {
    it('toScreenNormCoord handles finite numbers and fallback', () => {
      expect(toScreenNormCoord(120)).toBe(120);
      expect(toScreenNormCoord(Number.NaN)).toBe(0);
    });

    it('toPitchNormCoord clamps between 0 and 100 and handles NaN', () => {
      expect(toPitchNormCoord(150)).toBe(100);
      expect(toPitchNormCoord(-10)).toBe(0);
      expect(toPitchNormCoord(50)).toBe(50);
      expect(toPitchNormCoord(Number.NaN)).toBe(50);
    });

    it('toStagePixel handles finite numbers and fallback', () => {
      expect(toStagePixel(500.5)).toBe(500.5);
      expect(toStagePixel(Number.NaN)).toBe(0);
    });

    it('toMilliseconds handles positive numbers and fallback', () => {
      expect(toMilliseconds(1000)).toBe(1000);
      expect(toMilliseconds(-50)).toBe(0);
      expect(toMilliseconds(Number.NaN)).toBe(0);
    });

    it('toScreenNormPoint creates point with or without clamp', () => {
      expect(toScreenNormPoint(150, -30)).toEqual({ x: 115, y: -15 });
      expect(toScreenNormPoint(150, -30, false)).toEqual({ x: 150, y: -30 });
    });

    it('toPitchNormPoint creates clamped pitch coordinates', () => {
      expect(toPitchNormPoint(-10, 110)).toEqual({ x: 0, y: 100 });
      expect(toPitchNormPoint(50, 50)).toEqual({ x: 50, y: 50 });
    });

    it('toStagePixelPoint creates stage pixel coordinates', () => {
      expect(toStagePixelPoint(100, 200)).toEqual({ x: 100, y: 200 });
    });
  });

  describe('Zod Schemas', () => {
    it('ScreenNormCoordSchema transforms and clamps numbers', () => {
      expect(ScreenNormCoordSchema.parse(150)).toBe(115);
      expect(ScreenNormCoordSchema.parse(-20)).toBe(-15);
      expect(ScreenNormCoordSchema.parse(50)).toBe(50);
    });

    it('UnclampedScreenNormCoordSchema transforms without clamping', () => {
      expect(UnclampedScreenNormCoordSchema.parse(150)).toBe(150);
      expect(UnclampedScreenNormCoordSchema.parse(-20)).toBe(-20);
    });

    it('ScreenNormPointSchema transforms point with clamping', () => {
      const parsed = ScreenNormPointSchema.parse({ x: 150, y: -30 });
      expect(parsed).toEqual({ x: 115, y: -15 });
    });
  });
});

describe('Coordinate Conversion Engine', () => {
  const viewport: StageViewport = {
    width: 1000,
    height: 800,
    offsetX: 100,
    offsetY: 50,
  };

  describe('pitchNormToScreenNorm & screenNormToPitchNorm', () => {
    it('converts pitch center (50, 50) to screen center (50, 50) with default bounds', () => {
      const pitchPoint = toPitchNormPoint(50, 50);
      const screenPoint = pitchNormToScreenNorm(
        pitchPoint,
        DEFAULT_PITCH_FRAME_BOUNDS,
      );
      expect(screenPoint.x).toBeCloseTo(50);
      expect(screenPoint.y).toBeCloseTo(50);
    });

    it('roundtrips between pitchNorm and screenNorm', () => {
      const originalPitch = toPitchNormPoint(25, 75);
      const screenPoint = pitchNormToScreenNorm(originalPitch);
      const restoredPitch = screenNormToPitchNorm(screenPoint);

      expect(restoredPitch.x).toBeCloseTo(originalPitch.x);
      expect(restoredPitch.y).toBeCloseTo(originalPitch.y);
    });

    it('handles zero or negative width/height bounds safely', () => {
      const invalidBounds = { left: 0, top: 0, width: 0, height: 0 };
      const pitch = screenNormToPitchNorm(
        toScreenNormPoint(50, 50),
        invalidBounds,
      );
      expect(pitch).toEqual({ x: 50, y: 50 });
    });
  });

  describe('screenNormToStagePixel & stagePixelToScreenNorm', () => {
    it('converts screen norm to stage pixels with viewport offsets', () => {
      const screenPt = toScreenNormPoint(50, 25);
      const pixelPt = screenNormToStagePixel(screenPt, viewport);
      expect(pixelPt.x).toBe(600); // 100 + (50 / 100) * 1000
      expect(pixelPt.y).toBe(250); // 50 + (25 / 100) * 800
    });

    it('converts stage pixels back to screen norm', () => {
      const pixelPt = toStagePixelPoint(600, 250);
      const screenPt = stagePixelToScreenNorm(pixelPt, viewport);
      expect(screenPt.x).toBe(50);
      expect(screenPt.y).toBe(25);
    });

    it('roundtrips between screenNorm and stagePixel', () => {
      const originalScreen = toScreenNormPoint(33, 67);
      const pixelPt = screenNormToStagePixel(originalScreen, viewport);
      const restoredScreen = stagePixelToScreenNorm(pixelPt, viewport);

      expect(restoredScreen.x).toBeCloseTo(originalScreen.x);
      expect(restoredScreen.y).toBeCloseTo(originalScreen.y);
    });

    it('handles zero width/height viewport safely', () => {
      const zeroViewport: StageViewport = { width: 0, height: 0 };
      const screenPt = stagePixelToScreenNorm(
        toStagePixelPoint(100, 100),
        zeroViewport,
      );
      expect(screenPt).toEqual({ x: 50, y: 50 });
    });
  });
});
