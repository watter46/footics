import { describe, expect, it } from 'vitest';
import type { ShapeData } from '../types';
import { checkCornerRotateZone } from '../utils';

describe('Tactical Board Drawing Zone Utilities', () => {
  describe('checkCornerRotateZone', () => {
    it('returns false for non-zone shapes', () => {
      const arrowShape: ShapeData = {
        id: 'arrow-1',
        type: 'arrow',
        points: [0, 0, 100, 100],
        color: '#ffffff',
        strokeWidth: 2,
        dash: [],
        opacity: 1,
      };
      expect(checkCornerRotateZone({ x: 0, y: 0 }, arrowShape)).toBe(false);
    });

    it('returns true when hovering near corners of a zone', () => {
      const zoneShape: ShapeData = {
        id: 'zone-1',
        type: 'zone',
        x: 100,
        y: 100,
        width: 200,
        height: 100,
        zoneShape: 'rect',
        color: '#22c55e',
        strokeWidth: 2,
        dash: [],
        opacity: 1,
        rotation: 0,
      };

      // Top-left corner is at (100, 100)
      // Check 15px outside corner
      expect(checkCornerRotateZone({ x: 100 - 10, y: 100 - 10 }, zoneShape)).toBe(true);
      // Top-right corner is at (300, 100)
      expect(checkCornerRotateZone({ x: 300 + 10, y: 100 - 10 }, zoneShape)).toBe(true);
      // Far away point returns false
      expect(checkCornerRotateZone({ x: 500, y: 500 }, zoneShape)).toBe(false);
    });
  });
});
