import { useEffect, useState } from 'react';
import { getMatchMemo } from '@/lib/db/extension-db-queries';
import { STORAGE_KEYS } from '~/constants';
import type { MemoMode } from '~/types/schemas';

interface UseMatchMemoLoaderParams {
  matchId: string | undefined;
  mode: MemoMode;
  initialMemo?: string;
  isVisible: boolean;
}

/**
 * useMatchMemoLoader
 * 責務: Level 3 Feature View 用に、Extension キャッシュ (storage.local) や
 * IndexedDB (getMatchMemo) から試合メモを非同期解決する。
 */
export function useMatchMemoLoader({
  matchId,
  mode,
  initialMemo,
  isVisible,
}: UseMatchMemoLoaderParams): string | undefined {
  const [resolvedMemo, setResolvedMemo] = useState<string | undefined>(
    initialMemo,
  );

  useEffect(() => {
    if (!isVisible) {
      setResolvedMemo(undefined);
      return;
    }

    if (initialMemo !== undefined) {
      setResolvedMemo(initialMemo);
      return;
    }

    if (mode !== 'MATCH' || !matchId) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      try {
        const globalAny =
          typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
        const storageLocal =
          globalAny?.browser?.storage?.local ??
          globalAny?.chrome?.storage?.local ??
          undefined;

        if (storageLocal) {
          const cacheKey = `${STORAGE_KEYS.MATCH_MEMO_CACHE_PREFIX}${matchId}`;
          const stored = await storageLocal.get(cacheKey);
          const cachedMemo = stored?.[cacheKey];

          if (isMounted && typeof cachedMemo === 'string') {
            setResolvedMemo(cachedMemo);
            return;
          }
        }

        const existingMemo = await getMatchMemo(matchId);
        if (isMounted && existingMemo?.memo) {
          setResolvedMemo(existingMemo.memo);
        }
      } catch (err) {
        console.error('[useMatchMemoLoader] Failed to load memo:', err);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [matchId, mode, initialMemo, isVisible]);

  return resolvedMemo;
}
