import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db/schema';
import {
  blobToBase64,
  packPlayerPhotos,
  preloadSlidePlayerPhotos,
  TacticalExportSharePayloadSchema,
  type TacticalPlayerLike,
  type TacticalSceneLike,
  unpackPlayerPhotos,
} from '../share-payload';

describe('src/lib/tactical/export/share-payload', () => {
  beforeEach(async () => {
    await db.player_photos.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
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

  it('packs player photos from db.player_photos when style.insideContent === "photo"', async () => {
    const mockBlob = new Blob(['player-photo-content'], { type: 'image/webp' });
    await db.player_photos.put({
      playerId: 10,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    const scenes = [
      {
        id: 'scene-1',
        players: [
          {
            id: 'player-1',
            playerId: 10,
            style: {
              insideContent: 'photo',
            },
          },
          {
            id: 'player-2',
            playerId: 20,
            style: {
              insideContent: 'number',
            },
          },
        ],
      },
    ];

    const photos = await packPlayerPhotos(scenes);
    expect(photos['10']).toBeDefined();
    expect(photos['10']).toMatch(/^data:image\/webp;base64,/);
    expect(photos['20']).toBeUndefined();
  });

  it('preloads slide player photos and returns ImageBitmap map', async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockBlob = new Blob(['image-bytes'], { type: 'image/webp' });
    await db.player_photos.put({
      playerId: 42,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    const slides = [
      {
        id: 'slide-1',
        players: [
          {
            id: 'p-1',
            playerId: 42,
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const bitmaps = await preloadSlidePlayerPhotos(slides);
    expect(bitmaps['42']).toBeDefined();
    expect(bitmaps['42']).toBe(mockBitmap);
  });

  it('preloads slide player photos from existingPhotos if provided', async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
    // fetch mock
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
      }),
    );

    const slides = [
      {
        id: 'slide-1',
        players: [
          {
            id: 'p-1',
            playerId: 99,
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const existingPhotos = {
      '99': 'data:image/webp;base64,xxxx',
    };

    const bitmaps = await preloadSlidePlayerPhotos(slides, existingPhotos);
    expect(bitmaps['99']).toBeDefined();
    expect(bitmaps['99']).toBe(mockBitmap);
  });

  it('accepts TacticalSceneLike and TacticalPlayerLike typed structures', async () => {
    const player: TacticalPlayerLike = {
      playerId: 123,
      options: {
        insideContent: 'photo',
        photoUrl: 'https://example.com/p.png',
      },
    };
    const scene: TacticalSceneLike = {
      id: 'scene-type-test',
      players: [player],
    };

    const payload = TacticalExportSharePayloadSchema.parse({
      version: 1,
      createdAt: Date.now(),
      orientation: 'horizontal',
      scenes: [scene],
    });

    expect(payload.scenes).toHaveLength(1);
    expect(payload.scenes[0].id).toBe('scene-type-test');
  });

  it('rejects invalid scenes like primitives or null', () => {
    const invalidData = {
      version: 1,
      createdAt: Date.now(),
      orientation: 'horizontal' as const,
      scenes: [null, 123, 'not an object'],
    };

    const result = TacticalExportSharePayloadSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
