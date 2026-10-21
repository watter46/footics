import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db';
import { injectMatchToTactical } from '@/lib/tactical/match-to-tactical-bridge';
import { loadActiveProjectFromDb } from '@/lib/tactical/tactical-storage';

export interface UseTacticalMatchInitOptions {
  initialMatchId?: string;
  initialMinute?: number;
}

export interface UseTacticalMatchInitResult {
  isLoading: boolean;
  hasMatchQuery: boolean;
  matchId: string | null;
  error: Error | null;
}

async function loadAndInjectMatch(
  matchId: string,
  minute: number,
): Promise<void> {
  const numId = Number(matchId);
  const match =
    (!Number.isNaN(numId) ? await db.matches.get(numId as any) : null) ||
    (await db.matches.get(matchId)) ||
    (await db.matches.get(String(matchId)));
  if (!match) return;
  // 保存済みの同一試合プロジェクトがあれば既存スライドを優先し上書きしない
  const saved = await loadActiveProjectFromDb(String(match.id));
  if (saved) {
    useTacticalUnifiedStore.getState().loadProject(saved);
    return;
  }
  injectMatchToTactical({ match, minute });
}

/**
 * URLクエリパラメータまたは初期Propsから matchId と minute をパースし、
 * IndexedDBから試合データを取得して Tactical キャンバスに初期配置を流し込むフック
 */
export function useTacticalMatchInit(
  options: UseTacticalMatchInitOptions = {},
): UseTacticalMatchInitResult {
  const { initialMatchId, initialMinute } = options;
  const searchParams = useSearchParams();

  const matchIdParam =
    initialMatchId ?? searchParams?.get('matchId') ?? undefined;
  const minuteParam =
    initialMinute !== undefined
      ? initialMinute
      : (searchParams?.get('minute') ?? undefined);

  const minute =
    typeof minuteParam === 'number'
      ? minuteParam
      : minuteParam
        ? Number.parseInt(minuteParam, 10) || 0
        : 0;

  const hasMatchQuery = Boolean(matchIdParam);
  const [isLoading, setIsLoading] = useState<boolean>(hasMatchQuery);
  const [error, setError] = useState<Error | null>(null);
  const hasInitializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!matchIdParam) {
      setIsLoading(false);
      return;
    }

    const initKey = `${matchIdParam}_${minute}`;
    if (hasInitializedRef.current === initKey) {
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    loadAndInjectMatch(matchIdParam, minute)
      .then(() => {
        if (isMounted) {
          hasInitializedRef.current = initKey;
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const e = err instanceof Error ? err : new Error(String(err));
          console.error('[useTacticalMatchInit] Failed to load match:', e);
          setError(e);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [matchIdParam, minute]);

  return { isLoading, hasMatchQuery, matchId: matchIdParam ?? null, error };
}
