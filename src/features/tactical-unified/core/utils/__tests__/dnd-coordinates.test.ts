import { describe, expect, it } from 'vitest';
import { calculateDropPitchCoords } from '../dnd-coordinates';

describe('calculateDropPitchCoords', () => {
  it('calculates normalized pitch coordinates from client drop position', () => {
    const overRect = {
      left: 100,
      top: 50,
      width: 1000,
      height: 500,
    };

    // ドロップ位置がピッチ中央 (600, 300)
    const result = calculateDropPitchCoords(overRect, {
      clientX: 600,
      clientY: 300,
    });

    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  it('clamps coordinates to [5, 95] to prevent markers from spilling out of boundaries', () => {
    const overRect = {
      left: 100,
      top: 50,
      width: 1000,
      height: 500,
    };

    // ピッチの左上外側 (50, 0)
    const resultLeft = calculateDropPitchCoords(overRect, {
      clientX: 50,
      clientY: 0,
    });
    expect(resultLeft.x).toBe(5);
    expect(resultLeft.y).toBe(5);

    // ピッチの右下外側 (1500, 800)
    const resultRight = calculateDropPitchCoords(overRect, {
      clientX: 1500,
      clientY: 800,
    });
    expect(resultRight.x).toBe(95);
    expect(resultRight.y).toBe(95);
  });

  it('returns (50, 50) fallback when overRect has zero dimensions', () => {
    const result = calculateDropPitchCoords(
      { left: 0, top: 0, width: 0, height: 0 },
      { clientX: 100, clientY: 100 },
    );
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });
});
