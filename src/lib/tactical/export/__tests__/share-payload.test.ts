import { describe, expect, it } from 'vitest';
import {
  blobToBase64,
  packPlayerPhotos,
  TacticalExportSharePayloadSchema,
  unpackPlayerPhotos,
} from '../share-payload';

describe('src/lib/tactical/export/share-payload', () => {
  it('validates schema correctly', () => {
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
