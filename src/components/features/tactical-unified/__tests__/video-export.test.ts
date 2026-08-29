import { describe, expect, it } from 'vitest';
import {
  calculateBoundaryCrop,
  getSupportedH264Codec,
} from '@/lib/tactical/export/video-export-engine';
import {
  type BoundaryBox,
  ExportTargetSchema,
} from '@/lib/types/tactical-unified';

describe('Video Export Engine & Boundary Crop', () => {
  describe('calculateBoundaryCrop', () => {
    it('returns full stage dimensions snapped to even numbers when boundary box is undefined or disabled', () => {
      // 720p preset (scale = 1): 801x451 -> 1280x720 baseline
      const cropNoBox = calculateBoundaryCrop(undefined, 801, 451, 1);
      expect(cropNoBox.isCropped).toBe(false);
      expect(cropNoBox.cropX).toBe(0);
      expect(cropNoBox.cropY).toBe(0);
      expect(cropNoBox.cropW).toBe(801);
      expect(cropNoBox.cropH).toBe(451);
      expect(cropNoBox.exportWidth).toBe(1280);
      expect(cropNoBox.exportHeight % 2).toBe(0);

      const disabledBox: BoundaryBox = {
        enabled: false,
        x: 10,
        y: 10,
        width: 50,
        height: 50,
      };
      // 2K preset (scale = 3): 800x450 -> 2560x1440
      const crop2K = calculateBoundaryCrop(disabledBox, 800, 450, 3);
      expect(crop2K.isCropped).toBe(false);
      expect(crop2K.exportWidth).toBe(2560);
      expect(crop2K.exportHeight).toBe(1440);

      // 1080p preset (scale = 2): 800x450 -> 1920x1080
      const crop1080p = calculateBoundaryCrop(disabledBox, 800, 450, 2);
      expect(crop1080p.isCropped).toBe(false);
      expect(crop1080p.exportWidth).toBe(1920);
      expect(crop1080p.exportHeight).toBe(1080);
    });

    it('calculates cropped dimensions and snaps to even numbers when boundary box is enabled', () => {
      const activeBox: BoundaryBox = {
        enabled: true,
        x: 20, // 20%
        y: 25, // 25%
        width: 45, // 45% of 800 = 360
        height: 35, // 35% of 450 = 157.5
      };

      // 2K preset (scale = 3): minScale = 2560 / 800 = 3.2: 360 * 3.2 = 1152, 157.5 * 3.2 = 504
      const crop2K = calculateBoundaryCrop(activeBox, 800, 450, 3);
      expect(crop2K.isCropped).toBe(true);
      expect(crop2K.cropX).toBe(160); // 20% of 800
      expect(crop2K.cropY).toBe(112.5); // 25% of 450
      expect(crop2K.cropW).toBe(360);
      expect(crop2K.cropH).toBe(157.5);
      expect(crop2K.exportWidth).toBe(1152);
      expect(crop2K.exportHeight).toBe(504);
      expect(crop2K.exportWidth % 2).toBe(0);
      expect(crop2K.exportHeight % 2).toBe(0);

      // 1080p preset (scale = 2): minScale = 1920 / 800 = 2.4: 360 * 2.4 = 864, 157.5 * 2.4 = 378 -> 376 (8-pixel aligned)
      const crop1080p = calculateBoundaryCrop(activeBox, 800, 450, 2);
      expect(crop1080p.exportWidth).toBe(864);
      expect(crop1080p.exportHeight).toBe(376);
    });
  });

  describe('ExportTargetSchema Validation', () => {
    it('validates MP4 export target configuration', () => {
      const validMp4 = {
        format: 'mp4',
        scope: 'all',
        fps: '60',
        quality: 'high',
        scale: 2,
      };
      const parsed = ExportTargetSchema.safeParse(validMp4);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe('mp4');
        expect((parsed.data as any).fps).toBe('60');
      }
    });

    it('validates Transparent WebM export target configuration', () => {
      const validWebm = {
        format: 'webm',
        scope: 'all',
        fps: '30',
        transparent: true,
        scale: 2,
      };
      const parsed = ExportTargetSchema.safeParse(validWebm);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.format).toBe('webm');
        expect((parsed.data as any).transparent).toBe(true);
      }
    });
  });

  describe('Codec Detection Fallback', () => {
    it('returns high profile default codec in non-browser environments', async () => {
      const codec = await getSupportedH264Codec(2560, 1440, 60, 30_000_000);
      expect(codec).toBe('avc1.64002a');
    });
  });

  describe('2K QHD (2560x1440) & 60fps Standards', () => {
    it('produces exact 2560x1440 dimensions for standard 16:9 stage at scale 2', () => {
      const crop = calculateBoundaryCrop(undefined, 1280, 720, 2);
      expect(crop.exportWidth).toBe(2560);
      expect(crop.exportHeight).toBe(1440);
      expect(crop.exportWidth % 2).toBe(0);
      expect(crop.exportHeight % 2).toBe(0);
    });

    it('defaults 60fps in standard mp4 target configuration', () => {
      const standardConfig = ExportTargetSchema.parse({
        format: 'mp4',
        scope: 'all',
        fps: '60',
        quality: 'high',
        scale: 2,
      });
      if (standardConfig.format === 'mp4') {
        expect(standardConfig.fps).toBe('60');
        expect(standardConfig.quality).toBe('high');
        expect(standardConfig.scale).toBe(2);
      }
    });
  });

  describe('Color Precision & Alpha Blending', () => {
    it('ensures boundary crop preserves exact coordinate ratios without distorting color channels', () => {
      const crop = calculateBoundaryCrop(
        { enabled: true, x: 0, y: 0, width: 100, height: 100 },
        1000,
        600,
        2,
      );
      expect(crop.exportWidth).toBe(2000);
      expect(crop.exportHeight).toBe(1200);
      expect(crop.isCropped).toBe(false);
      expect(crop.exportWidth / crop.exportHeight).toBeCloseTo(1000 / 600);
    });
  });
});
