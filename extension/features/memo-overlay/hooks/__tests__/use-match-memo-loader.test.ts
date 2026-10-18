import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as dbQueries from '@/lib/db/extension-db-queries';
import { STORAGE_KEYS } from '../../../../constants';
import { useMatchMemoLoader } from '../use-match-memo-loader';

vi.mock('@/lib/db/extension-db-queries', () => ({
  getMatchMemo: vi.fn(),
}));

describe('useMatchMemoLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (globalThis as any).browser;
    delete (globalThis as any).chrome;
  });

  it('initialMemo が渡された場合は即座にそれを返す', () => {
    const { result } = renderHook(() =>
      useMatchMemoLoader({
        matchId: 'match-1',
        mode: 'MATCH',
        initialMemo: '既知のメモ',
        isVisible: true,
      }),
    );

    expect(result.current).toBe('既知のメモ');
  });

  it('isVisible が false の場合は undefined を返す', () => {
    const { result } = renderHook(() =>
      useMatchMemoLoader({
        matchId: 'match-1',
        mode: 'MATCH',
        initialMemo: '既知のメモ',
        isVisible: false,
      }),
    );

    expect(result.current).toBeUndefined();
  });

  it('storage.local キャッシュからメモをロードする', async () => {
    const mockStorageGet = vi.fn().mockResolvedValue({
      [`${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}match-1`]:
        'キャッシュされたメモ',
    });

    (globalThis as any).browser = {
      storage: {
        local: {
          get: mockStorageGet,
        },
      },
    };

    const { result } = renderHook(() =>
      useMatchMemoLoader({
        matchId: 'match-1',
        mode: 'MATCH',
        isVisible: true,
      }),
    );

    await waitFor(() => {
      expect(result.current).toBe('キャッシュされたメモ');
    });

    expect(mockStorageGet).toHaveBeenCalledWith(
      `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}match-1`,
    );
    expect(dbQueries.getMatchMemo).not.toHaveBeenCalled();
  });

  it('キャッシュが存在しない場合は IndexedDB (getMatchMemo) からフォールバック読み込みを行う', async () => {
    const mockStorageGet = vi.fn().mockResolvedValue({});

    (globalThis as any).browser = {
      storage: {
        local: {
          get: mockStorageGet,
        },
      },
    };

    (dbQueries.getMatchMemo as any).mockResolvedValue({
      id: 'memo-1',
      match_id: 'match-1',
      memo: 'IndexedDBから取得したメモ',
      updated_at: Date.now(),
    });

    const { result } = renderHook(() =>
      useMatchMemoLoader({
        matchId: 'match-1',
        mode: 'MATCH',
        isVisible: true,
      }),
    );

    await waitFor(() => {
      expect(result.current).toBe('IndexedDBから取得したメモ');
    });

    expect(dbQueries.getMatchMemo).toHaveBeenCalledWith('match-1');
  });
});
