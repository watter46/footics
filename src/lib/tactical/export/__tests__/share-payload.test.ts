import { describe, expect, it } from 'vitest';
import {
  blobToBase64,
  packPlayerPhotos,
  TacticalExportSharePayloadSchema,
  unpackPlayerPhotos,
} from '../share-payload';

describe('src/lib/tactical/export/share-payload', () => {
  it('validates schema correctly with default aspectRatio fallback', () => {
    const validData = {
      version: 1,
      createdAt: Date.now(),
      title: 'Test Title',
      orientation: 'vertical' as const,
      teamVisibility: 'both' as const,
      exportFps: 30,
      scenes: [
        {
          id: 'scene-1',
          durationMs: 1500,
          pauseMs: 500,
          easing: 'easeInOut',
          players: {},
        },
      ],
      photos: {
        '1': 'data:image/png;base64,xxxx',
      },
    };

    const result = TacticalExportSharePayloadSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      // vertical orientation fallback to '9:16'
      expect(result.data.aspectRatio).toBe('9:16');
    }
  });

  it('validates schema with explicit aspectRatio, boundaryBox, and pitchTransform', () => {
    const validData = {
      version: 1,
      createdAt: Date.now(),
      title: 'Test Title with 4:5 and Crop',
      orientation: 'horizontal' as const,
      teamVisibility: 'both' as const,
      exportFps: 60,
      aspectRatio: '4:5' as const,
      boundaryBox: {
        x: 0.1,
        y: 0.2,
        width: 0.8,
        height: 0.6,
      },
      pitchTransform: {
        panX: 10,
        panY: -20,
        zoom: 1.2,
        tilt: 15,
        isLocked: false,
      },
      scenes: [
        {
          id: 'scene-1',
          players: {},
        },
      ],
      photos: {},
    };

    const result = TacticalExportSharePayloadSchema.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aspectRatio).toBe('4:5');
      expect(result.data.boundaryBox).toMatchObject({
        x: 0.1,
        y: 0.2,
        width: 0.8,
        height: 0.6,
      });
      expect(result.data.pitchTransform).toEqual({
        panX: 10,
        panY: -20,
        zoom: 1.2,
        tilt: 15,
        isLocked: false,
      });
    }
  });

  it('converts Blob to base64 data URL', async () => {
    const blob = new Blob(['hello world'], { type: 'text/plain' });
    const base64 = await blobToBase64(blob);
    expect(base64).toMatch(/^data:text\/plain;base64,/);
  });

  it('handles empty scenes in packPlayerPhotos', async () => {
    const photos = await packPlayerPhotos([]);
    expect(photos).toEqual({});
  });

  it('handles empty photos in unpackPlayerPhotos', async () => {
    const bitmaps = await unpackPlayerPhotos({});
    expect(bitmaps).toEqual({});
  });
});
