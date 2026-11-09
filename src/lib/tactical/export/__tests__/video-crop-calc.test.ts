import { describe, expect, it } from 'vitest';
import { calculateBoundaryCrop } from '../video-crop-calc';

describe('calculateBoundaryCrop (1080p FHD Lock)', () => {
  it('locks to 1080p FHD even when scale is 1 and stage is smaller (720p downscale eliminated)', () => {
    // stageWidth: 960, stageHeight: 540, scale: 1
    // Previously, scale < 1.5 fell back to 720p (1280x720).
    // Now it must lock to 1080p FHD (1920x1080).
    const cropSmall = calculateBoundaryCrop(null, 960, 540, 1);
    expect(cropSmall.exportWidth).toBe(1920);
    expect(cropSmall.exportHeight).toBe(1080);
    expect(cropSmall.isCropped).toBe(false);
  });

  it('calculates 1080p dimensions for various aspect ratios', () => {
    // 16:9
    const crop169 = calculateBoundaryCrop(null, 1920, 1080, 1);
    expect(crop169.exportWidth).toBe(1920);
    expect(crop169.exportHeight).toBe(1080);
    expect(crop169.isCropped).toBe(false);

    // 9:16
    const crop916 = calculateBoundaryCrop(null, 1080, 1920, 1);
    expect(crop916.exportWidth).toBe(1080);
    expect(crop916.exportHeight).toBe(1920);

    // 4:5 (1350 is aligned to nearest multiple of 8: 1352)
    const crop45 = calculateBoundaryCrop(null, 1080, 1350, 1);
    expect(crop45.exportWidth).toBe(1080);
    expect(crop45.exportHeight).toBe(1352);

    // 1:1
    const crop11 = calculateBoundaryCrop(null, 1080, 1080, 1);
    expect(crop11.exportWidth).toBe(1080);
    expect(crop11.exportHeight).toBe(1080);

    // 4:3
    const crop43 = calculateBoundaryCrop(null, 1440, 1080, 1);
    expect(crop43.exportWidth).toBe(1440);
    expect(crop43.exportHeight).toBe(1080);
  });
});
