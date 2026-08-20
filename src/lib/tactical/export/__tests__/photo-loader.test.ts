import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { savePlayerPhoto } from '@/lib/db/queries';
import { db } from '@/lib/db/schema';
import type {
  AnimationPlayerState,
  TacticalScene,
} from '@/stores/tactical-animation-store';
import {
  clearPhotoCache,
  getPhotoCacheSize,
  preloadPlayerPhotos,
} from '../photo-loader';

function createDummyPlayer(
  playerId: string,
  options: Partial<AnimationPlayerState['options']> = {},
): AnimationPlayerState {
  return {
    playerId,
    name: 'Player',
    shirtNo: '10',
    team: 'home',
    area: 'pitch',
    x: 50,
    y: 50,
    options: {
      color: '#3b82f6',
      insideContent: 'number',
      bottomLabel: 'name',
      ...options,
    },
  };
}

describe('preloadPlayerPhotos', () => {
  const fakeBitmap = {
    width: 100,
    height: 100,
    close: vi.fn(),
  } as unknown as ImageBitmap;

  beforeEach(async () => {
    clearPhotoCache();
    await db.players.clear();
    vi.restoreAllMocks();

    // グローバル window.createImageBitmap のモック
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(fakeBitmap));
  });

  afterEach(() => {
    clearPhotoCache();
    vi.unstubAllGlobals();
  });

  it('skips fetch completely when scenes have no photo markers', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 2000,
        pauseMs: 0,
        players: {
          p1: createDummyPlayer('p1', {
            insideContent: 'number',
            bottomLabel: 'name',
          }),
          p2: createDummyPlayer('p2', {
            insideContent: 'none',
            bottomLabel: 'none',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    const result = await preloadPlayerPhotos(scenes);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({});
    expect(getPhotoCacheSize()).toBe(0);
  });

  it('skips fetch when photoUrl is missing or empty string', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 2000,
        pauseMs: 0,
        players: {
          p1: createDummyPlayer('p1', {
            insideContent: 'photo',
            photoUrl: '',
            bottomLabel: 'name',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    const result = await preloadPlayerPhotos(scenes);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('fetches photo on first call and caches it for subsequent calls', async () => {
    const mockBlob = new Blob(['dummy-image-data'], { type: 'image/png' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => mockBlob,
    } as Response);

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 2000,
        pauseMs: 0,
        players: {
          p1: createDummyPlayer('p1', {
            insideContent: 'photo',
            photoUrl: 'https://example.com/player1.png',
            bottomLabel: 'name',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    // 1回目の呼び出し: fetch が実行される
    const result1 = await preloadPlayerPhotos(scenes);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result1.p1).toBeDefined();
    expect(getPhotoCacheSize()).toBe(1);

    // 2回目の呼び出し: キャッシュから取得され fetch は追加実行されない
    const result2 = await preloadPlayerPhotos(scenes);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // 呼び出し回数は増えない
    expect(result2.p1).toBeDefined();
  });

  it('handles fetch failure gracefully without throwing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 2000,
        pauseMs: 0,
        players: {
          p1: createDummyPlayer('p1', {
            insideContent: 'photo',
            photoUrl: 'https://example.com/not-found.png',
            bottomLabel: 'name',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    const result = await preloadPlayerPhotos(scenes);
    expect(result.p1).toBeUndefined();
    expect(getPhotoCacheSize()).toBe(0);
  });

  it('loads photoBlob directly from IndexedDB without any network fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const mockBlob = new Blob(['local-player-photo-blob'], {
      type: 'image/png',
    });

    // Save photo directly to IndexedDB
    await savePlayerPhoto(1001, mockBlob, 'Local Hero');

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 1500,
        pauseMs: 0,
        players: {
          '1001': createDummyPlayer('1001', {
            insideContent: 'photo',
            bottomLabel: 'name',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    const result = await preloadPlayerPhotos(scenes);

    // fetch must NEVER be called
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result['1001']).toBeDefined();
    expect(createImageBitmap).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'image/png' }),
    );
  });

  it('handles hybrid scenario: some players from IndexedDB and others from URL', async () => {
    const mockDbBlob = new Blob(['db-blob'], { type: 'image/png' });
    await savePlayerPhoto(2001, mockDbBlob, 'DB Player');

    const mockUrlBlob = new Blob(['url-blob'], { type: 'image/png' });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => mockUrlBlob,
    } as Response);

    const scenes: TacticalScene[] = [
      {
        id: 'scene-1',
        durationMs: 1500,
        pauseMs: 0,
        players: {
          '2001': createDummyPlayer('2001', {
            insideContent: 'photo',
            bottomLabel: 'name',
          }),
          '2002': createDummyPlayer('2002', {
            insideContent: 'photo',
            photoUrl: 'https://example.com/external.png',
            bottomLabel: 'name',
          }),
          '2003': createDummyPlayer('2003', {
            insideContent: 'number',
            bottomLabel: 'number',
          }),
        },
        ballPos: { x: 50, y: 50 },
      },
    ];

    const result = await preloadPlayerPhotos(scenes);

    // Only player 2002 was fetched from URL
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/external.png',
      expect.anything(),
    );

    expect(result['2001']).toBeDefined();
    expect(result['2002']).toBeDefined();
    expect(result['2003']).toBeUndefined();
  });
});
