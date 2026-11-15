import { useSearchParams } from 'next/navigation';
import { useContext, useEffect, useRef, useState } from 'react';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { db } from '@/lib/db';
import {
  buildMatchToDomainProject,
  type MatchDomainProjectBundle,
} from '@/lib/tactical/acl/match-project-translator';

export interface UseTacticalMatchInitOptions {
  initialMatchId?: string;
  initialMinute?: number;
  injectToStore?: boolean;
}

export type TacticalMatchInitialState = MatchDomainProjectBundle;

export interface UseTacticalMatchInitResult {
  isLoading: boolean;
  hasMatchQuery: boolean;
  matchId: string | null;
  initialState?: TacticalMatchInitialState;
  error: Error | null;
}

export async function resolveMatchInitialState(
  matchId: string,
  minute: number,
): Promise<TacticalMatchInitialState | undefined> {
  const match = await db.matches.get(matchId);
  if (!match) return undefined;
  return buildMatchToDomainProject(match, { minute });
}

/**
 * URLクエリパラメータまたは初期Propsから matchId と minute をパースし、
 * IndexedDBから試合データを取得して Tactical キャンバスに初期配置を流し込むフック
 */
export function useTacticalMatchInit(
  options: UseTacticalMatchInitOptions = {},
): UseTacticalMatchInitResult {
  const { initialMatchId, initialMinute, injectToStore = true } = options;
  const storesContext = useContext(TacticalStoresContext);
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
      : Number.parseInt(minuteParam ?? '', 10) || 0;

  const hasMatchQuery = Boolean(matchIdParam);
  const [isLoading, setIsLoading] = useState<boolean>(hasMatchQuery);
  const [initialState, setInitialState] = useState<
    TacticalMatchInitialState | undefined
  >(undefined);
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

    resolveMatchInitialState(matchIdParam, minute)
      .then((resolved) => {
        if (!isMounted) return;
        hasInitializedRef.current = initKey;
        if (resolved) {
          setInitialState(resolved);
          if (injectToStore && storesContext) {
            storesContext.documentStore
              .getState()
              .loadProject(resolved.project);
            storesContext.sessionStore
              .getState()
              .setActivePhaseId(resolved.activePhaseId);
            storesContext.sessionStore
              .getState()
              .setActiveSlideId(resolved.activeSlideId);
          }
        }
        setIsLoading(false);
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
  }, [matchIdParam, minute, storesContext, injectToStore]);

  return {
    isLoading,
    hasMatchQuery,
    matchId: matchIdParam ?? null,
    initialState,
    error,
  };
}
