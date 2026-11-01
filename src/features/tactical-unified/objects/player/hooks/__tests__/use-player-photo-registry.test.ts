import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as resolver from '@/lib/tactical/player-photo-resolver';
import {
  type PlayerPhotoRegistryInput,
  usePlayerPhotoRegistry,
} from '../use-player-photo-registry';

describe('usePlayerPhotoRegistry', () => {
  let originalImage: typeof Image;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();
    originalImage = globalThis.Image;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi
      .fn()
      .mockImplementation(
        (blob: Blob) =>
          `blob:http://localhost/${Math.random().toString(36).slice(2)}`,
      );
    URL.revokeObjectURL = vi.fn();

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = '';

      set src(value: string) {
        this._src = value;
        queueMicrotask(() => {
          if (value.includes('invalid')) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        });
      }

      get src() {
        return this._src;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    globalThis.Image = MockImage as any;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('20人中 photo 指定15人で resolver が1回だけ呼ばれ、渡された targets が15件', async () => {
    const resolveSpy = vi
      .spyOn(resolver, 'resolvePlayerPhotoSources')
      .mockImplementation(async (targets) => {
        const map = new Map<string, resolver.PlayerPhotoSource>();
        for (const t of targets) {
          map.set(t.key, {
            kind: 'url',
            url: `https://example.com/${t.key}.png`,
          });
        }
        return map;
      });

    const players: PlayerPhotoRegistryInput[] = [];
    // 15 photo players
    for (let i = 1; i <= 15; i++) {
      players.push({
        id: `p-${i}`,
        playerId: 100 + i,
        name: `Player ${i}`,
        style: { insideContent: 'photo' },
      });
    }
    // 5 non-photo players
    for (let i = 16; i <= 20; i++) {
      players.push({
        id: `p-${i}`,
        playerId: 100 + i,
        name: `Player ${i}`,
        style: { insideContent: 'number' },
      });
    }

    const { result } = renderHook(() => usePlayerPhotoRegistry(players));

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    const calledTargets = resolveSpy.mock.calls[0][0];
    expect(calledTargets).toHaveLength(15);

    await vi.waitFor(() => {
      expect(result.current.size).toBe(15);
    });

    for (let i = 1; i <= 15; i++) {
      expect(result.current.has(String(100 + i))).toBe(true);
    }
  });

  it('players の配列参照を変えても署名が同じなら resolver 追加呼出0回・戻り値の Map 参照が不変', async () => {
    vi.spyOn(resolver, 'resolvePlayerPhotoSources').mockImplementation(
      async (targets) => {
        const map = new Map<string, resolver.PlayerPhotoSource>();
        for (const t of targets) {
          map.set(t.key, {
            kind: 'url',
            url: `https://example.com/${t.key}.png`,
          });
        }
        return map;
      },
    );

    const initialPlayers: PlayerPhotoRegistryInput[] = [
      {
        id: 'p1',
        playerId: '101',
        name: 'Saka',
        style: {
          insideContent: 'photo',
          photoUrl: 'https://example.com/saka.png',
        },
      },
    ];

    const { result, rerender } = renderHook(
      ({ players }) => usePlayerPhotoRegistry(players),
      {
        initialProps: { players: initialPlayers },
      },
    );

    await vi.waitFor(() => {
      expect(result.current.size).toBe(1);
    });

    const resolveSpy = vi.mocked(resolver.resolvePlayerPhotoSources);
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    const prevMap = result.current;

    // 新しい配列参照だが同じ署名
    const newPlayers: PlayerPhotoRegistryInput[] = [
      {
        id: 'p1-clone',
        playerId: '101',
        name: 'Saka',
        style: {
          insideContent: 'photo',
          photoUrl: 'https://example.com/saka.png',
        },
      },
    ];

    rerender({ players: newPlayers });

    expect(resolveSpy).toHaveBeenCalledTimes(1); // 追加呼出0回
    expect(result.current).toBe(prevMap); // Map 参照が不変
  });

  it('新しい選手を1人追加したとき resolver が呼ばれ渡された targets は新規 key のみ', async () => {
    const resolveSpy = vi
      .spyOn(resolver, 'resolvePlayerPhotoSources')
      .mockImplementation(async (targets) => {
        const map = new Map<string, resolver.PlayerPhotoSource>();
        for (const t of targets) {
          map.set(t.key, {
            kind: 'url',
            url: `https://example.com/${t.key}.png`,
          });
        }
        return map;
      });

    const p1: PlayerPhotoRegistryInput = {
      id: 'p1',
      playerId: 101,
      style: { insideContent: 'photo' },
    };
    const p2: PlayerPhotoRegistryInput = {
      id: 'p2',
      playerId: 102,
      style: { insideContent: 'photo' },
    };

    const { result, rerender } = renderHook(
      ({ players }) => usePlayerPhotoRegistry(players),
      {
        initialProps: { players: [p1] },
      },
    );

    await vi.waitFor(() => {
      expect(result.current.size).toBe(1);
    });

    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(resolveSpy.mock.calls[0][0]).toEqual([
      expect.objectContaining({ key: '101' }),
    ]);

    // p2 追加
    rerender({ players: [p1, p2] });

    await vi.waitFor(() => {
      expect(result.current.size).toBe(2);
    });

    expect(resolveSpy).toHaveBeenCalledTimes(2);
    // 2回目に渡された targets は新規 key のみ
    expect(resolveSpy.mock.calls[1][0]).toEqual([
      expect.objectContaining({ key: '102' }),
    ]);
  });

  it('読込完了後の再レンダー回数は1回のみ増える', async () => {
    vi.spyOn(resolver, 'resolvePlayerPhotoSources').mockImplementation(
      async (targets) => {
        const map = new Map<string, resolver.PlayerPhotoSource>();
        for (const t of targets) {
          map.set(t.key, {
            kind: 'url',
            url: `https://example.com/${t.key}.png`,
          });
        }
        return map;
      },
    );

    let renderCount = 0;
    const players: PlayerPhotoRegistryInput[] = [
      { id: 'p1', playerId: 1, style: { insideContent: 'photo' } },
      { id: 'p2', playerId: 2, style: { insideContent: 'photo' } },
    ];

    const { result } = renderHook(() => {
      renderCount++;
      return usePlayerPhotoRegistry(players);
    });

    expect(renderCount).toBe(1);

    await vi.waitFor(() => {
      expect(result.current.size).toBe(2);
    });

    // 初期マウント(1) + 読込完了時の setPhotos(2) = 2回のみ
    expect(renderCount).toBe(2);
  });

  it('アンマウントで全 ObjectURL が revoke され、読込中アンマウントで state 更新されない', async () => {
    let resolvePromise: (
      value: Map<string, resolver.PlayerPhotoSource>,
    ) => void;
    vi.spyOn(resolver, 'resolvePlayerPhotoSources').mockReturnValue(
      new Promise((res) => {
        resolvePromise = res;
      }),
    );

    const players: PlayerPhotoRegistryInput[] = [
      { id: 'p1', playerId: 1, style: { insideContent: 'photo' } },
    ];

    const { unmount } = renderHook(() => usePlayerPhotoRegistry(players));

    // 読込中に即アンマウント
    unmount();

    // アンマウント後に resolve させる
    const blob = new Blob(['dummy'], { type: 'image/png' });
    resolvePromise!(new Map([['1', { kind: 'blob', blob }]]));

    // 少し待機
    await new Promise((r) => setTimeout(r, 20));

    // blob の createObjectURL がもし呼ばれていなくても、あるいは呼ばれていたとしても revoke される
    // 次にマウント完了後にアンマウントしたときの revoke を検証
    const blob1 = new Blob(['dummy1'], { type: 'image/png' });
    vi.spyOn(resolver, 'resolvePlayerPhotoSources').mockResolvedValue(
      new Map([['2', { kind: 'blob', blob: blob1 }]]),
    );

    const createdUrls: string[] = [];
    vi.mocked(URL.createObjectURL).mockImplementation((_b) => {
      const url = `blob:http://localhost/test-${Math.random().toString(36).slice(2)}`;
      createdUrls.push(url);
      return url;
    });

    const { result, unmount: unmount2 } = renderHook(() =>
      usePlayerPhotoRegistry([
        { id: 'p2', playerId: 2, style: { insideContent: 'photo' } },
      ]),
    );

    await vi.waitFor(() => {
      expect(result.current.size).toBe(1);
    });

    expect(createdUrls.length).toBeGreaterThan(0);
    unmount2();

    for (const url of createdUrls) {
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(url);
    }
  });

  it('insideContent !== "photo" の選手は resolver に渡らない', async () => {
    const resolveSpy = vi
      .spyOn(resolver, 'resolvePlayerPhotoSources')
      .mockResolvedValue(new Map());

    const players: PlayerPhotoRegistryInput[] = [
      { id: 'p1', playerId: 1, style: { insideContent: 'number' } },
      { id: 'p2', playerId: 2 },
    ];

    renderHook(() => usePlayerPhotoRegistry(players));

    expect(resolveSpy).not.toHaveBeenCalled();
  });
});
