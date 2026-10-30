import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateSlideInProject } from '@/features/tactical-unified/stores/store-helpers';
import type {
  TacticalUnifiedState,
  TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { db } from '@/lib/db';
import { buildMatchTacticalPlayers } from '@/lib/tactical/match-to-tactical-bridge';
import { loadActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import {
  createDefaultProject,
  ensureTacticalProject,
} from '@/lib/types/tactical-unified';

export interface UseTacticalMatchInitOptions {
  initialMatchId?: string;
  initialMinute?: number;
  injectToStore?: boolean;
}

export interface UseTacticalMatchInitResult {
  isLoading: boolean;
  hasMatchQuery: boolean;
  matchId: string | null;
  initialState?: Partial<TacticalUnifiedState>;
  error: Error | null;
}

export async function resolveMatchInitialState(
  matchId: string,
  minute: number,
): Promise<Partial<TacticalUnifiedState> | undefined> {
  const match = await db.matches.get(matchId);
  if (!match) return undefined;

  // 保存済みの同一試合プロジェクトがあれば既存スライドを優先し上書きしない
  const saved = await loadActiveProjectFromDb(String(match.id));
  if (saved) {
    const normalized = ensureTacticalProject(saved);
    return {
      project: normalized,
      activePhaseId: normalized.activePhaseId,
      activeSlideId: normalized.activeSlideId,
      pitchFitPending: false,
    };
  }

  const baseProject = createDefaultProject(crypto.randomUUID());
  const { allPlayers, homeFormation, awayFormation } =
    buildMatchTacticalPlayers({
      match,
      minute,
      homeColor: baseProject.homeColor.primary,
      awayColor: baseProject.awayColor.primary,
      aspectRatio: baseProject.aspectRatio,
    });

  const title =
    match.homeTeam?.name && match.awayTeam?.name
      ? `${match.homeTeam.name} vs ${match.awayTeam.name} (${minute}')`
      : baseProject.title;

  const targetSlideId = baseProject.activeSlideId;
  const updatedProject = {
    ...updateSlideInProject(baseProject, targetSlideId, (s) => ({
      ...s,
      players: allPlayers,
    })),
    matchId: String(match.id),
    matchFormations: {
      home: homeFormation,
      away: awayFormation,
    },
    title,
    updatedAt: new Date().toISOString(),
  };

  const normalized = ensureTacticalProject(updatedProject);
  return {
    project: normalized,
    activePhaseId: normalized.activePhaseId,
    activeSlideId: normalized.activeSlideId,
    pitchFitPending: false,
  };
}

/**
 * URLクエリパラメータまたは初期Propsから matchId と minute をパースし、
 * IndexedDBから試合データを取得して Tactical キャンバスに初期配置を流し込むフック
 */
export function useTacticalMatchInit(
  options: UseTacticalMatchInitOptions = {},
): UseTacticalMatchInitResult {
  const { initialMatchId, initialMinute, injectToStore = true } = options;
  const storeApi = useTacticalUnifiedStoreApi();
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
    Partial<TacticalUnifiedState> | undefined
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
          if (injectToStore && resolved.project) {
            storeApi.getState().loadProject(resolved.project);
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
  }, [matchIdParam, minute, storeApi, injectToStore]);

  return {
    isLoading,
    hasMatchQuery,
    matchId: matchIdParam ?? null,
    initialState,
    error,
  };
}
