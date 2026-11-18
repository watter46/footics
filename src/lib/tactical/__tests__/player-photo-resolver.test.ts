import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db/schema';
import { getPlayerPhotoKey } from '../player-photo-key';
import {
  type PlayerPhotoTarget,
  resolvePlayerPhotoSources,
} from '../player-photo-resolver';

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
  beforeEach(async () => {
    vi.restoreAllMocks();
    await Promise.all([db.player_photos.clear(), db.players.clear()]);
  });

  describe('resolution order', () => {
    const dummyBlob1 = new Blob(['blob-1'], { type: 'image/webp' });
    const dummyBlob2 = new Blob(['blob-2'], { type: 'image/webp' });
    const dummyBlob5 = new Blob(['blob-5'], { type: 'image/webp' });

    it('resolves priority 1: player_photos Blob', async () => {
      await db.player_photos.put({
        playerId: 101,
        photoBlob: dummyBlob1,
        mimeType: 'image/webp',
        updatedAt: Date.now(),
      });

      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');
      const playersWhereSpy = vi.spyOn(db.players, 'where');

      const targets: PlayerPhotoTarget[] = [
        {
          key: '101',
          playerId: 101,
          name: 'Player One',
          photoUrl: 'https://example.com/target.jpg',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      const resolved = result.get('101');
      expect(resolved?.kind).toBe('blob');
      if (resolved?.kind === 'blob') {
        expect(resolved.blob.size).toBe(dummyBlob1.size);
      }
      expect(photosWhereSpy).toHaveBeenCalledTimes(1);
      // Because all targets are resolved by priority 1, master batch and name search are skipped
      expect(playersWhereSpy).not.toHaveBeenCalled();
    });

    it('falls back to target photoUrl when player_photos Blob is absent even if players record has photoBlob', async () => {
      await db.players.put({
        id: '26-27_102',
        playerId: 102,
        name: 'Player Two',
        season: '26-27',
        photoBlob: dummyBlob2,
        photoUrl: 'https://example.com/master.jpg',
        updatedAt: Date.now(),
      });

      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');
      const playersWhereSpy = vi.spyOn(db.players, 'where');

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
        kind: 'url',
        url: 'https://example.com/target.jpg',
      });
      expect(photosWhereSpy).toHaveBeenCalledTimes(2);
      expect(playersWhereSpy).toHaveBeenCalledTimes(1);
    });

    it('resolves priority 3: target photoUrl when blobs are absent', async () => {
      await db.players.put({
        id: '26-27_103',
        playerId: 103,
        name: 'Player Three',
        season: '26-27',
        photoUrl: 'https://example.com/master.jpg',
        updatedAt: Date.now(),
      });

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
    });

    it('resolves priority 4: master photoUrl when target photoUrl is absent', async () => {
      await db.players.put({
        id: '26-27_104',
        playerId: 104,
        name: 'Player Four',
        season: '26-27',
        photoUrl: 'https://example.com/master.jpg',
        updatedAt: Date.now(),
      });

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
    });

    it('resolves priority 5: name search Blob when 1-4 are absent', async () => {
      await db.players.put({
        id: '26-27_999',
        playerId: 999,
        name: 'Player Five',
        season: '26-27',
        updatedAt: Date.now(),
      });
      await db.player_photos.put({
        playerId: 999,
        photoBlob: dummyBlob5,
        mimeType: 'image/webp',
        updatedAt: Date.now(),
      });

      const targets: PlayerPhotoTarget[] = [
        {
          key: '105',
          playerId: 105,
          name: 'Player Five',
        },
      ];

      const result = await resolvePlayerPhotoSources(targets);

      const resolved = result.get('105');
      expect(resolved?.kind).toBe('blob');
      if (resolved?.kind === 'blob') {
        expect(resolved.blob.size).toBe(dummyBlob5.size);
      }
    });
  });

  describe('batching and performance', () => {
    it('makes at most 1 call each for 20 targets', async () => {
      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');
      const playersWhereSpy = vi.spyOn(db.players, 'where');

      const targets: PlayerPhotoTarget[] = Array.from(
        { length: 20 },
        (_, i) => ({
          key: `k-${i + 1}`,
          playerId: i + 1,
          name: `Player ${i + 1}`,
        }),
      );

      await resolvePlayerPhotoSources(targets);

      expect(photosWhereSpy).toHaveBeenCalledTimes(1);
      expect(playersWhereSpy).toHaveBeenCalledTimes(1);
    });

    it('makes 0 DB calls when targets list is empty', async () => {
      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');
      const playersWhereSpy = vi.spyOn(db.players, 'where');

      const result = await resolvePlayerPhotoSources([]);

      expect(result.size).toBe(0);
      expect(photosWhereSpy).not.toHaveBeenCalled();
      expect(playersWhereSpy).not.toHaveBeenCalled();
    });

    it('makes 0 DB calls when targets have no valid numeric playerId and no name', async () => {
      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');
      const playersWhereSpy = vi.spyOn(db.players, 'where');

      const targets: PlayerPhotoTarget[] = [
        { key: 't1', playerId: 0 },
        { key: 't2', playerId: Number.NaN },
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
      expect(photosWhereSpy).not.toHaveBeenCalled();
      expect(playersWhereSpy).not.toHaveBeenCalled();
    });

    it('deduplicates targets with identical keys', async () => {
      const photosWhereSpy = vi.spyOn(db.player_photos, 'where');

      const targets: PlayerPhotoTarget[] = [
        { key: 'k1', playerId: 10, name: 'First' },
        { key: 'k1', playerId: 10, name: 'Duplicate' },
      ];

      await resolvePlayerPhotoSources(targets);

      expect(photosWhereSpy).toHaveBeenCalledTimes(1);
      expect(photosWhereSpy).toHaveBeenCalledWith('playerId');
    });
  });

  describe('error handling', () => {
    it('does not throw when DB queries reject and logs console.warn', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.spyOn(db.player_photos, 'where').mockImplementationOnce(() => {
        throw new Error('DB failure');
      });
      vi.spyOn(db.players, 'where').mockImplementationOnce(() => {
        throw new Error('DB failure 2');
      });

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
    });
  });
});
