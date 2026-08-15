import { describe, expect, it } from 'vitest';
import { getBenchPos, toActualPos, toViewPos } from '../coordinates';

describe('coordinates', () => {
  describe('getBenchPos', () => {
    it('calculates the correct coordinates for index 0', () => {
      expect(getBenchPos(0)).toEqual({ x: 15, y: 10 });
    });
    it('calculates the correct coordinates for index 1', () => {
      expect(getBenchPos(1)).toEqual({ x: 50, y: 10 });
    });
    it('calculates the correct coordinates for index 3 (new row)', () => {
      expect(getBenchPos(3)).toEqual({ x: 15, y: 25 });
    });
  });

  describe('toViewPos', () => {
    it('returns the same coordinates if not flipped', () => {
      expect(toViewPos({ x: 30, y: 40 }, false)).toEqual({ x: 30, y: 40 });
    });

    it('returns rotated coordinates (100 - val) if flipped', () => {
      expect(toViewPos({ x: 30, y: 40 }, true)).toEqual({ x: 70, y: 60 });
    });
  });

  describe('toActualPos', () => {
    it('reverses toViewPos correctly', () => {
      expect(toActualPos({ x: 70, y: 60 }, true)).toEqual({ x: 30, y: 40 });
      expect(toActualPos({ x: 30, y: 40 }, false)).toEqual({ x: 30, y: 40 });
    });
  });
});
