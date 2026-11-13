# TASK-181kcb: 試合初期化フック (useTacticalMatchInit) ・スカッド連携 (squad-actions) 移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j-181k)
- **DependsOn**: TASK-181ja, TASK-181jb, TASK-181jh
- **Commit**: `refactor(tactical): migrate useTacticalMatchInit and squad-actions to Domain ACL, placement helpers, and Dexie storage`

---

## 🎯 目的・背景

`use-tactical-match-init.ts` と `squad-actions.ts` から旧 `tactical-unified-store` / `match-to-tactical-bridge` / `squad-to-tactical-bridge` 依存を撤廃し、`acl/match-project-translator`・`domain/squad-placement`・`TacticalStoreProvider` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `use-tactical-match-init.ts`・`squad-actions.ts` に `tactical-unified-store` / `tactical-unified-store-provider` / `match-to-tactical-bridge` / `squad-to-tactical-bridge` の参照を残してはならない。
- `use-tactical-match-init.ts` は `<TacticalStoreProvider>` 外（`TacticalClientPage` 等）から呼ばれても例外を投げないよう `useContext(TacticalStoresContext)` で任意参照すること。

---

## 🏗️ Phase 構成

- **Phase 1**: `use-tactical-match-init.ts`・`squad-actions.ts`（2プロダクション＋0テスト）

---

### Phase 1: `use-tactical-match-init.ts`・`squad-actions.ts` の移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts`
  - `src/features/teams/utils/squad-actions.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/use-tactical-match-init.ts`

**Before:**
```ts
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { updateSlideInProject } from '@/features/tactical-unified/stores/store-helpers';
import type {
  TacticalUnifiedState,
  TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { db } from '@/lib/db';
import {
  buildMatchTacticalPlayers,
  injectMatchToTactical,
} from '@/lib/tactical/match-to-tactical-bridge';
import {
  createDefaultProject,
  ensureTacticalProject,
} from '@/lib/types/tactical-unified';

export { injectMatchToTactical } from '@/lib/tactical/match-to-tactical-bridge';

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
```
**After:**
```ts
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
```

**Before:**
```ts
export function useTacticalMatchInit(
  options: UseTacticalMatchInitOptions = {},
): UseTacticalMatchInitResult {
  const { initialMatchId, initialMinute, injectToStore = true } = options;
  const storeApi = useTacticalUnifiedStoreApi();
  const searchParams = useSearchParams();
```
**After:**
```ts
export function useTacticalMatchInit(
  options: UseTacticalMatchInitOptions = {},
): UseTacticalMatchInitResult {
  const { initialMatchId, initialMinute, injectToStore = true } = options;
  const storesContext = useContext(TacticalStoresContext);
  const searchParams = useSearchParams();
```

**Before:**
```ts
  const hasMatchQuery = Boolean(matchIdParam);
  const [isLoading, setIsLoading] = useState<boolean>(hasMatchQuery);
  const [initialState, setInitialState] = useState<
    Partial<TacticalUnifiedState> | undefined
  >(undefined);
```
**After:**
```ts
  const hasMatchQuery = Boolean(matchIdParam);
  const [isLoading, setIsLoading] = useState<boolean>(hasMatchQuery);
  const [initialState, setInitialState] = useState<
    TacticalMatchInitialState | undefined
  >(undefined);
```

**Before:**
```ts
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
```
**After:**
```ts
        if (resolved) {
          setInitialState(resolved);
          if (injectToStore && storesContext) {
            storesContext.documentStore.getState().loadProject(resolved.project);
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
```

#### Task 1.2 `[MODIFY]` `src/features/teams/utils/squad-actions.ts`

**Before:**
```ts
import {
  CHELSEA_PRESETS_BY_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { injectTeamSquadToTactical } from '@/lib/tactical/squad-to-tactical-bridge';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
```
**After:**
```ts
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  CHELSEA_PRESETS_BY_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { applyTacticalCommand } from '@/lib/tactical/domain/project-reducer';
import { buildDomainSquadPlayers } from '@/lib/tactical/domain/squad-placement';
import {
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
```

**Before:**
```ts
  const handleOpenTacticalCanvas = () => {
    injectTeamSquadToTactical({
      teamName: teamConfig.name,
      team: 'home',
      players: mergedPlayers,
      formation: '4-2-3-1',
      mode: 'half',
    });
    toast.success(
      `${teamConfig.shortName} のスカッドを Tactical Canvas に読み込みました`,
    );
    router.push('/tactical');
  };
```
**After:**
```ts
  const handleOpenTacticalCanvas = async () => {
    try {
      const existing = await loadActiveProjectFromDb();
      const bundle = existing
        ? normalizeTacticalProject(existing)
        : (() => {
            const fresh = createDefaultTacticalProject();
            return {
              project: fresh,
              activePhaseId: fresh.phases[0]?.id ?? '',
              activeSlideId: fresh.phases[0]?.slides[0]?.id ?? '',
            };
          })();
      const phase =
        bundle.project.phases.find((p) => p.id === bundle.activePhaseId) ??
        bundle.project.phases[0];
      const slide =
        phase?.slides.find((s) => s.id === bundle.activeSlideId) ??
        phase?.slides[0];
      if (phase && slide) {
        const newTeamPlayers = buildDomainSquadPlayers(mergedPlayers, {
          team: 'home',
          formation: '4-2-3-1',
          mode: 'half',
          primaryColor: bundle.project.homeColor.primary,
          aspectRatio: phase.aspectRatio,
        }).map((p) => ({
          ...p,
          style: { ...p.style, insideContent: 'photo' as const },
        }));
        const otherTeamPlayers = slide.players.filter((p) => p.team !== 'home');
        const updatedProject = applyTacticalCommand(bundle.project, {
          type: 'APPLY_SLIDE_COMMAND',
          phaseId: phase.id,
          slideId: slide.id,
          command: {
            type: 'REPLACE_PLAYERS',
            players: [...otherTeamPlayers, ...newTeamPlayers],
          },
        });
        await saveActiveProjectToDb(updatedProject);
      }
      toast.success(
        `${teamConfig.shortName} のスカッドを Tactical Canvas に読み込みました`,
      );
      router.push('/tactical');
    } catch {
      toast.error('Tactical Canvas への読み込みに失敗しました');
    }
  };
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/hooks/use-tactical-match-init.ts src/features/teams/utils/squad-actions.ts
  ```
