import { describe, expect, it } from 'vitest';
import {
  calculateContainVideoCrop,
  type VideoDimensions,
} from '../video-cropper';

describe('calculateContainVideoCrop', () => {
  it('should calculate letterboxing (top/bottom black bars) when video is wider than viewport', () => {
    // 16:9 video in 4:3 viewport
    const dimensions: VideoDimensions = {
      videoWidth: 1920,
      videoHeight: 1080,
      viewportWidth: 1200,
      viewportHeight: 900,
      devicePixelRatio: 1,
    };

    const crop = calculateContainVideoCrop(dimensions);

    // videoAspect = 1.7777, viewportAspect = 1.3333
    // renderWidth = 1200, renderHeight = 1200 / (1920/1080) = 675
    // offsetY = (900 - 675) / 2 = 112.5 -> 113
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(113);
    expect(crop.width).toBe(1200);
    expect(crop.height).toBe(675);
  });

  it('should calculate pillarboxing (left/right black bars) when video is taller than viewport', () => {
    // 4:3 video in 16:9 viewport
    const dimensions: VideoDimensions = {
      videoWidth: 1440,
      videoHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
    };

    const crop = calculateContainVideoCrop(dimensions);

    // videoAspect = 1.3333, viewportAspect = 1.7777
    // renderHeight = 1080, renderWidth = 1080 * (4/3) = 1440
    // offsetX = (1920 - 1440) / 2 = 240
    expect(crop.x).toBe(240);
    expect(crop.y).toBe(0);
    expect(crop.width).toBe(1440);
    expect(crop.height).toBe(1080);
  });

  it('should handle exact aspect ratio match with zero offsets', () => {
    const dimensions: VideoDimensions = {
      videoWidth: 1920,
      videoHeight: 1080,
      viewportWidth: 1920,
      viewportHeight: 1080,
      devicePixelRatio: 1,
    };

    const crop = calculateContainVideoCrop(dimensions);

    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBe(1920);
    expect(crop.height).toBe(1080);
  });

  it('should scale bounding box correctly with devicePixelRatio', () => {
    const dimensions: VideoDimensions = {
      videoWidth: 1920,
      videoHeight: 1080,
      viewportWidth: 1000,
      viewportHeight: 1000,
      devicePixelRatio: 2,
    };

    const crop = calculateContainVideoCrop(dimensions);

    // renderWidth = 1000, renderHeight = 1000 / (16/9) = 562.5
    // offsetY = (1000 - 562.5) / 2 = 218.75
    // With DPR 2:
    // x = 0, y = Math.round(218.75 * 2) = 438
    // width = 2000, height = Math.round(562.5 * 2) = 1125
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(438);
    expect(crop.width).toBe(2000);
    expect(crop.height).toBe(1125);
  });

  it('should safely fallback if video dimensions are missing or 0', () => {
    const dimensions: VideoDimensions = {
      videoWidth: 0,
      videoHeight: 0,
      viewportWidth: 1280,
      viewportHeight: 720,
      devicePixelRatio: 1,
    };

    const crop = calculateContainVideoCrop(dimensions);

    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
    expect(crop.width).toBe(1280);
    expect(crop.height).toBe(720);
  });
});
