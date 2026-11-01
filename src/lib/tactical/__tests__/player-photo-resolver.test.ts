import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPlayerPhotosBatch } from '@/lib/db/player-photos';
import {
  findPlayerPhotosByNames,
  getPlayersMasterBatch,
} from '@/lib/db/queries';
import { getPlayerPhotoKey } from '../player-photo-key';
import {
  type PlayerPhotoTarget,
  resolvePlayerPhotoSources,
} from '../player-photo-resolver';

vi.mock('@/lib/db/player-photos', () => ({
  getPlayerPhotosBatch: vi.fn(),
}));

vi.mock('@/lib/db/queries', () => ({
  getPlayersMasterBatch: vi.fn(),
  findPlayerPhotosByNames: vi.fn(),
}));

describe('player-photo-key', () => {
  it('returns playerId as string when playerId is provided', () => {
    expect(getPlayerPhotoKey({ playerId: 123 })).toBe('123');
    expect(getPlayerPhotoKey({ playerId: '456', id: '789' })).toBe('456');
  });

  it('falls back to id when playerId is missing', () => {
    expect(getPlayerPhotoKey({ id: 'abc' })).toBe('abc');
    expect(getPlayerPhotoKey({ id: 999 })).toBe('999');
  });

  it('returns empty string when neither is provided', () => {
    expect(getPlayerPhotoKey({})).toBe('');
  });
});

describe('player-photo-resolver', () => {
  const mockGetPlayerPhotosBatch = vi.mocked(getPlayerPhotosBatch);
  const mockGetPlayersMasterBatch = vi.mocked(getPlayersMasterBatch);
  const mockFindPlayerPhotosByNames = vi.mocked(findPlayerPhotosByNames);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlayerPhotosBatch.mockResolvedValue(new Map());
    mockGetPlayersMasterBatch.mockResolvedValue(new Map());
    mockFindPlayerPhotosByNames.mockResolvedValue(new Map());
  });

  describe('resolution order', () => {
    const dummyBlob1 = new Blob(['blob-1'], { type: 'image/webp' });
    const dummyBlob2 = new Blob(['blob-2'], { type: 'image/webp' });
    const dummyBlob5 = new Blob(['blob-5'], { type: 'image/webp' });

    it('resolves priority 1: player_photos Blob', async () => {
      mockGetPlayerPhotosBatch.mockResolvedValue(new Map([[101, dummyBlob1]]));

      const targets: PlayerPhotoTarget[] = [
        {
          key: '101',
          playerId: 101,
          name: 'Player One',
          photoUrl: 'https://example.com/target.jpg',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('101')).toEqual({
        kind: 'blob',
        blob: dummyBlob1,
      });
      expect(mockGetPlayerPhotosBatch).toHaveBeenCalledTimes(1);
      // Because all targets are resolved by priority 1, master batch and name search are skipped
      expect(mockGetPlayersMasterBatch).not.toHaveBeenCalled();
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('resolves priority 2: players master photoBlob when player_photos Blob is absent', async () => {
      mockGetPlayersMasterBatch.mockResolvedValue(
        new Map([
          [
            102,
            {
              id: '26-27_102',
              playerId: 102,
              name: 'Player Two',
              photoBlob: dummyBlob2,
              photoUrl: 'https://example.com/master.jpg',
            } as any,
          ],
        ]),
      );

      const targets: PlayerPhotoTarget[] = [
        {
          key: '102',
          playerId: 102,
          name: 'Player Two',
          photoUrl: 'https://example.com/target.jpg',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('102')).toEqual({
        kind: 'blob',
        blob: dummyBlob2,
      });
      expect(mockGetPlayerPhotosBatch).toHaveBeenCalledTimes(1);
      expect(mockGetPlayersMasterBatch).toHaveBeenCalledTimes(1);
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('resolves priority 3: target photoUrl when blobs are absent', async () => {
      mockGetPlayersMasterBatch.mockResolvedValue(
        new Map([
          [
            103,
            {
              id: '26-27_103',
              playerId: 103,
              name: 'Player Three',
              photoUrl: 'https://example.com/master.jpg',
            } as any,
          ],
        ]),
      );

      const targets: PlayerPhotoTarget[] = [
        {
          key: '103',
          playerId: 103,
          name: 'Player Three',
          photoUrl: '  https://example.com/target.jpg  ',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('103')).toEqual({
        kind: 'url',
        url: 'https://example.com/target.jpg',
      });
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('resolves priority 4: master photoUrl when target photoUrl is absent', async () => {
      mockGetPlayersMasterBatch.mockResolvedValue(
        new Map([
          [
            104,
            {
              id: '26-27_104',
              playerId: 104,
              name: 'Player Four',
              photoUrl: 'https://example.com/master.jpg',
            } as any,
          ],
        ]),
      );

      const targets: PlayerPhotoTarget[] = [
        {
          key: '104',
          playerId: 104,
          name: 'Player Four',
          photoUrl: '   ',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('104')).toEqual({
        kind: 'url',
        url: 'https://example.com/master.jpg',
      });
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('resolves priority 5: name search Blob when 1-4 are absent', async () => {
      mockFindPlayerPhotosByNames.mockResolvedValue(
        new Map([['Player Five', dummyBlob5]]),
      );

      const targets: PlayerPhotoTarget[] = [
        {
          key: '105',
          playerId: 105,
          name: 'Player Five',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('105')).toEqual({
        kind: 'blob',
        blob: dummyBlob5,
      });
      expect(mockFindPlayerPhotosByNames).toHaveBeenCalledTimes(1);
      expect(mockFindPlayerPhotosByNames).toHaveBeenCalledWith(['Player Five']);
    });
  });

  describe('batching and performance', () => {
    it('makes at most 1 call each for 20 targets', async () => {
      const targets: PlayerPhotoTarget[] = Array.from(
        { length: 20 },
        (_, i) => ({
          key: `k-${i + 1}`,
          playerId: i + 1,
          name: `Player ${i + 1}`,
        }),
      );

      await resolvePlayerPhotoSources(targets);

      expect(mockGetPlayerPhotosBatch).toHaveBeenCalledTimes(1);
      expect(mockGetPlayersMasterBatch).toHaveBeenCalledTimes(1);
      expect(mockFindPlayerPhotosByNames).toHaveBeenCalledTimes(1);
    });

    it('makes 0 DB calls when targets list is empty', async () => {
      const result = await resolvePlayerPhotoSources([]);

      expect(result.size).toBe(0);
      expect(mockGetPlayerPhotosBatch).not.toHaveBeenCalled();
      expect(mockGetPlayersMasterBatch).not.toHaveBeenCalled();
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('makes 0 DB calls when targets have no valid numeric playerId and no name', async () => {
      const targets: PlayerPhotoTarget[] = [
        { key: 't1', playerId: 0 },
        { key: 't2', playerId: 'invalid' as any },
        {
          key: 't3',
          playerId: undefined,
          photoUrl: 'https://example.com/pic.jpg',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      expect(result.get('t3')).toEqual({
        kind: 'url',
        url: 'https://example.com/pic.jpg',
      });
      expect(mockGetPlayerPhotosBatch).not.toHaveBeenCalled();
      expect(mockGetPlayersMasterBatch).not.toHaveBeenCalled();
      expect(mockFindPlayerPhotosByNames).not.toHaveBeenCalled();
    });

    it('deduplicates targets with identical keys', async () => {
      const targets: PlayerPhotoTarget[] = [
        { key: 'k1', playerId: 10, name: 'First' },
        { key: 'k1', playerId: 10, name: 'Duplicate' },
      ];

      await resolvePlayerPhotoSources(targets);

      expect(mockGetPlayerPhotosBatch).toHaveBeenCalledWith([10]);
    });
  });

  describe('error handling', () => {
    it('does not throw when DB queries reject and logs console.warn', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetPlayerPhotosBatch.mockRejectedValue(new Error('DB failure'));
      mockGetPlayersMasterBatch.mockRejectedValue(new Error('DB failure 2'));
      mockFindPlayerPhotosByNames.mockRejectedValue(new Error('DB failure 3'));

      const targets: PlayerPhotoTarget[] = [
        {
          key: 'k1',
          playerId: 10,
          name: 'Player',
          photoUrl: 'https://fallback.com/p.jpg',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      // Target photoUrl should still be resolved even if DB fails
      expect(result.get('k1')).toEqual({
        kind: 'url',
        url: 'https://fallback.com/p.jpg',
      });
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
