import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotosDb from '@/lib/db/player-photos';
import * as queries from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import {
  blobToBase64,
  createBitmapFromUrlOrBase64,
  packPlayerPhotos,
  preloadMarbleTextureBitmap,
  preloadPlayerPhotos,
  preloadSlidePlayerPhotos,
  TacticalExportSharePayloadSchema,
  type TacticalPlayerLike,
  type TacticalSceneLike,
  unpackPlayerPhotos,
} from '../share-payload';

describe('src/lib/tactical/export/share-payload', () => {
  beforeEach(async () => {
    await db.player_photos.clear();
    await db.players.clear();
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
        yaw: 90,
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

  it('creates bitmap in worker context when window is undefined', async () => {
    const originalWindow = globalThis.window;
    try {
      delete (globalThis as Record<string, unknown>).window;
      const mockBitmap = { width: 50, height: 50 } as unknown as ImageBitmap;
      vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          blob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
        }),
      );

      const bitmap = await createBitmapFromUrlOrBase64(
        'https://example.com/test.png',
      );
      expect(bitmap).toBe(mockBitmap);
    } finally {
      if (originalWindow !== undefined) {
        globalThis.window = originalWindow;
      }
    }
  });

  it('preloads marble texture bitmap when texture is marble', async () => {
    const mockBitmap = { width: 100, height: 100 } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
      }),
    );

    // With texture: 'marble'
    const result1 = await preloadMarbleTextureBitmap({
      texture: 'marble',
    } as any);
    expect(result1).toBe(mockBitmap);

    // With pitchBackgroundType: 'marble'
    const result2 = await preloadMarbleTextureBitmap({
      pitchBackgroundType: 'marble',
    } as any);
    expect(result2).toBe(mockBitmap);

    // With flat / solid
    const result3 = await preloadMarbleTextureBitmap({
      texture: 'flat',
    } as any);
    expect(result3).toBeNull();

    // With undefined
    const result4 = await preloadMarbleTextureBitmap(undefined);
    expect(result4).toBeNull();
  });

  it('packs player photos for negative temporary playerIds from db.player_photos', async () => {
    const mockBlob = new Blob(['manual-player-photo-bytes'], {
      type: 'image/webp',
    });
    await db.player_photos.put({
      playerId: -12345,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    const scenes = [
      {
        id: 'scene-neg-1',
        players: [
          {
            id: 'p-neg-1',
            playerId: -12345,
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const photos = await packPlayerPhotos(scenes);
    expect(photos['-12345']).toBeDefined();
    expect(photos['-12345']).toMatch(/^data:image\/webp;base64,/);
  });

  it('preloads photos for negative temporary playerIds using preloadPlayerPhotos', async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockBlob = new Blob(['manual-player-photo-bytes'], {
      type: 'image/webp',
    });
    await db.player_photos.put({
      playerId: -12345,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    const scenes = [
      {
        id: 'scene-neg-2',
        players: [
          {
            id: 'p-neg-2',
            playerId: -12345,
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const bitmaps = await preloadPlayerPhotos(scenes);
    expect(bitmaps['-12345']).toBeDefined();
    expect(bitmaps['-12345']).toBe(mockBitmap);
  });

  it('preloads photos via name matching when playerId has no photo in preloadPlayerPhotos', async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const mockBlob = new Blob(['name-matched-photo-bytes'], {
      type: 'image/webp',
    });
    // playerId 999 のマスターと写真を登録
    await db.players.put({
      id: 'player-master-999',
      playerId: 999,
      name: 'Malo Gusto',
      season: '2024-2025',
      updatedAt: Date.now(),
    });
    await db.player_photos.put({
      playerId: 999,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    // 選手マーカーは playerId: 100 (DBに写真なし), name: 'Malo Gusto'
    const scenes = [
      {
        id: 'scene-name-preload',
        players: [
          {
            id: 'p-1',
            playerId: 100,
            name: 'Malo Gusto',
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const bitmaps = await preloadPlayerPhotos(scenes);
    expect(bitmaps['100']).toBeDefined();
    expect(bitmaps['100']).toBe(mockBitmap);
  });

  it('does not call DB functions when all photos are resolved by existingPhotos', async () => {
    const mockBitmap = {
      width: 100,
      height: 100,
      close: vi.fn(),
    } as unknown as ImageBitmap;
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['bytes'])),
      }),
    );

    const getPlayerPhotosSpy = vi.spyOn(playerPhotosDb, 'getPlayerPhotosBatch');
    const getMasterSpy = vi.spyOn(queries, 'getPlayersMasterBatch');
    const findByNameSpy = vi.spyOn(queries, 'findPlayerPhotosByNames');

    const scenes = [
      {
        id: 'scene-existing',
        players: [
          {
            id: 'p-1',
            playerId: 55,
            name: 'Player 55',
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const existingPhotos = {
      '55': 'data:image/webp;base64,resolved',
    };

    const bitmaps = await preloadPlayerPhotos(scenes, existingPhotos);
    expect(bitmaps['55']).toBe(mockBitmap);
    expect(getPlayerPhotosSpy).not.toHaveBeenCalled();
    expect(getMasterSpy).not.toHaveBeenCalled();
    expect(findByNameSpy).not.toHaveBeenCalled();
  });

  it('packs player photos via name matching when playerId has no photo in packPlayerPhotos', async () => {
    const mockBlob = new Blob(['name-matched-pack-bytes'], {
      type: 'image/webp',
    });
    await db.players.put({
      id: 'player-master-888',
      playerId: 888,
      name: 'Cole Palmer',
      season: '2024-2025',
      updatedAt: Date.now(),
    });
    await db.player_photos.put({
      playerId: 888,
      photoBlob: mockBlob,
      mimeType: 'image/webp',
      updatedAt: Date.now(),
    });

    const scenes = [
      {
        id: 'scene-name-pack',
        players: [
          {
            id: 'p-pack',
            playerId: 200,
            name: 'Cole Palmer',
            style: { insideContent: 'photo' },
          },
        ],
      },
    ];

    const photos = await packPlayerPhotos(scenes);
    expect(photos['200']).toBeDefined();
    expect(photos['200']).toMatch(/^data:image\/webp;base64,/);
  });
});
