import { describe, expect, it } from 'vitest';
import { calculatePitchTextureCover } from '../pitch-texture-geometry';

describe('calculatePitchTextureCover', () => {
  const sampleImageSize = { width: 679, height: 800 };

  it('calculates cover rect for 16:9 aspect ratio pitch bounds', () => {
    const pitchBounds = { left: 100, top: 50, width: 1600, height: 900 };
    const rect = calculatePitchTextureCover(pitchBounds, sampleImageSize);

    // 16:9 is wider than 679:800, so width matches pitch width and height exceeds pitch height
    expect(rect.width).toBeCloseTo(1600, 2);
    const expectedScale = 1600 / 679;
    const expectedHeight = 800 * expectedScale;
    expect(rect.height).toBeCloseTo(expectedHeight, 2);
    expect(rect.x).toBeCloseTo(100, 2);
    expect(rect.y).toBeCloseTo(50 + (900 - expectedHeight) / 2, 2);

    // Verify it completely covers the pitch bounds
    expect(rect.x).toBeLessThanOrEqual(pitchBounds.left);
    expect(rect.y).toBeLessThanOrEqual(pitchBounds.top);
    expect(rect.x + rect.width).toBeGreaterThanOrEqual(
      pitchBounds.left + pitchBounds.width,
    );
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(
      pitchBounds.top + pitchBounds.height,
    );
  });

  it('calculates cover rect for 9:16 aspect ratio pitch bounds', () => {
    const pitchBounds = { left: 0, top: 0, width: 900, height: 1600 };
    const rect = calculatePitchTextureCover(pitchBounds, sampleImageSize);

    // 9:16 is taller, so height matches and width exceeds
    const expectedScale = 1600 / 800; // 2
    expect(rect.height).toBeCloseTo(1600, 2);
    expect(rect.width).toBeCloseTo(679 * expectedScale, 2);
    expect(rect.x).toBeCloseTo((900 - 679 * expectedScale) / 2, 2);
    expect(rect.y).toBeCloseTo(0, 2);

    expect(rect.x).toBeLessThanOrEqual(pitchBounds.left);
    expect(rect.y).toBeLessThanOrEqual(pitchBounds.top);
    expect(rect.x + rect.width).toBeGreaterThanOrEqual(
      pitchBounds.left + pitchBounds.width,
    );
    expect(rect.y + rect.height).toBeGreaterThanOrEqual(
      pitchBounds.top + pitchBounds.height,
    );
  });

  it('calculates cover rect for 4:5 aspect ratio pitch bounds', () => {
    const pitchBounds = { left: 50, top: 50, width: 800, height: 1000 };
    const rect = calculatePitchTextureCover(pitchBounds, sampleImageSize);

    // pitch aspect: 0.8, image aspect: 679/800 = 0.84875 (image is slightly wider)
    // scale = max(800/679, 1000/800) = max(1.178, 1.25) = 1.25
    expect(rect.height).toBeCloseTo(1000, 2);
    expect(rect.width).toBeCloseTo(679 * 1.25, 2);
    expect(rect.x).toBeCloseTo(50 + (800 - 679 * 1.25) / 2, 2);
    expect(rect.y).toBeCloseTo(50, 2);

    expect(rect.x).toBeLessThanOrEqual(pitchBounds.left);
    expect(rect.y).toBeLessThanOrEqual(pitchBounds.top);
  });

  it('calculates cover rect for 1:1 aspect ratio pitch bounds', () => {
    const pitchBounds = { left: 0, top: 0, width: 1000, height: 1000 };
    const rect = calculatePitchTextureCover(pitchBounds, sampleImageSize);

    const expectedScale = 1000 / 679;
    expect(rect.width).toBeCloseTo(1000, 2);
    expect(rect.height).toBeCloseTo(800 * expectedScale, 2);
    expect(rect.x).toBeCloseTo(0, 2);
    expect(rect.y).toBeCloseTo((1000 - 800 * expectedScale) / 2, 2);

    expect(rect.x).toBeLessThanOrEqual(pitchBounds.left);
    expect(rect.y).toBeLessThanOrEqual(pitchBounds.top);
  });

  it('handles boundary/degenerate cases safely without NaN or infinity', () => {
    const fallbackBounds = { left: 10, top: 20, width: 100, height: 200 };

    // Zero image dimensions
    const zeroImage = calculatePitchTextureCover(fallbackBounds, {
      width: 0,
      height: 0,
    });
    expect(zeroImage).toEqual({ x: 10, y: 20, width: 100, height: 200 });

    // Negative dimensions
    const negativeImage = calculatePitchTextureCover(fallbackBounds, {
      width: -10,
      height: 100,
    });
    expect(negativeImage).toEqual({ x: 10, y: 20, width: 100, height: 200 });

    // Zero pitch dimensions
    const zeroPitch = calculatePitchTextureCover(
      { left: 10, top: 20, width: 0, height: 0 },
      sampleImageSize,
    );
    expect(zeroPitch).toEqual({ x: 10, y: 20, width: 0, height: 0 });
  });
});
