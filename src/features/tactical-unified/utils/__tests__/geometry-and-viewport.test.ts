import { describe, expect, it } from 'vitest';
import {
  pointerToNormalizedCoord,
  resolveBoundaryBoxPixelRect,
} from '../../core/utils/geometry';

describe('geometry-and-viewport', () => {
  describe('resolveBoundaryBoxPixelRect', () => {
    it('always uses pitchRect (16:9 screen vRect) as base coordinate frame', () => {
      const pitchRect = { x: 100, y: 50, width: 800, height: 450 };
      const stageSize = { width: 1000, height: 600 };

      // Case 1: default fitTarget
      const box1 = { x: 10, y: 20, width: 80, height: 60 };
      const resolved1 = resolveBoundaryBoxPixelRect(box1, stageSize, pitchRect);
      expect(resolved1).toEqual({
        x: 180,
        y: 140,
        width: 640,
        height: 270,
      });

      // Case 2: box.fitTarget === 'canvas' should STILL use pitchRect in single 16:9 screen coords
      const box2 = { x: 0, y: 0, width: 100, height: 100, fitTarget: 'canvas' };
      const resolved2 = resolveBoundaryBoxPixelRect(box2, stageSize, pitchRect);
      expect(resolved2).toEqual({
        x: 100,
        y: 50,
        width: 800,
        height: 450,
      });
    });

    it('falls back to stageSize if pitchRect is missing or invalid', () => {
      const stageSize = { width: 1920, height: 1080 };
      const box = { x: 10, y: 10, width: 50, height: 50 };
      const resolved = resolveBoundaryBoxPixelRect(box, stageSize, undefined);
      expect(resolved).toEqual({
        x: 192,
        y: 108,
        width: 960,
        height: 540,
      });
    });
  });

  describe('pointerToNormalizedCoord', () => {
    const vRect = { x: 100, y: 50, width: 800, height: 400 };

    it('converts in-bounds pixel position to 0..100 normalized coords', () => {
      const pos = { x: 500, y: 250 }; // exact center
      const norm = pointerToNormalizedCoord(pos, vRect);
      expect(norm).toEqual({ x: 50, y: 50 });
    });

    it('clamps to 0..100 when allowOverflow is false or undefined', () => {
      // Out of bounds: negative
      const negPos = { x: 20, y: 10 }; // x < 100, y < 50
      expect(pointerToNormalizedCoord(negPos, vRect)).toEqual({ x: 0, y: 0 });
      expect(
        pointerToNormalizedCoord(negPos, vRect, { allowOverflow: false }),
      ).toEqual({ x: 0, y: 0 });

      // Out of bounds: positive excess
      const bigPos = { x: 1000, y: 600 }; // x > 900, y > 450
      expect(pointerToNormalizedCoord(bigPos, vRect)).toEqual({
        x: 100,
        y: 100,
      });
    });

    it('allows coordinates outside 0..100 when allowOverflow is true', () => {
      const outPos = { x: 20, y: 550 };
      // relX = -80, normX = (-80 / 800) * 100 = -10
      // relY = 500, normY = (500 / 400) * 100 = 125
      const norm = pointerToNormalizedCoord(outPos, vRect, {
        allowOverflow: true,
      });
      expect(norm).toEqual({ x: -10, y: 125 });
    });
  });
});
