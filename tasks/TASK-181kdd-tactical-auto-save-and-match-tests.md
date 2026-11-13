# TASK-181kdd: AutoSave・MatchInit テストの3周波数ストア移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181kb, TASK-181kcb
- **Commit**: `test(tactical): migrate use-tactical-auto-save-match and use-tactical-match-init tests to 3-frequency stores`

---

## 🎯 目的・背景

`TASK-181kb`・`TASK-181kcb` の実装移行に合わせ、`use-tactical-auto-save-match.test.ts` および `use-tactical-match-init.test.ts` から `useTacticalUnifiedStore`・`TacticalUnifiedStoreProvider`・`createDefaultProject` 依存を完全除去する。

## 🚨 残存禁止条件 (Negative Contracts)

- 両テストファイルに `tactical-unified-store` / `tactical-unified-store-provider` / `@/lib/types/tactical-unified` を一切残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `use-tactical-auto-save-match.test.ts`・`use-tactical-match-init.test.ts` 移行（2テストファイル）

---

### Phase 1: `use-tactical-auto-save-match.test.ts`・`use-tactical-match-init.test.ts`

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts`
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts`

**Before:**
```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db/schema';
import {
  getTacticalProjectStorageKey,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import { useTacticalAutoSave } from '../use-tactical-auto-save';

function projectFor(matchId: string, title: string) {
  const p = createDefaultProject(`proj-${matchId}`);
  p.matchId = matchId;
  p.title = title;
  return p;
}

describe('useTacticalAutoSave (試合別)', () => {
  beforeEach(async () => {
    await db.keyval.delete(getTacticalProjectStorageKey('m1'));
    await db.keyval.delete(getTacticalProjectStorageKey('m2'));
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('matchId ごとに復元され、保存のない試合は前試合を引き継がない', async () => {
    await saveActiveProjectToDb(projectFor('m1', 'Match One'), 'm1');

    const { rerender } = renderHook(
      ({ matchId }) => useTacticalAutoSave({ matchId }),
      { initialProps: { matchId: 'm1' } },
    );
    await waitFor(() => {
      expect(useTacticalUnifiedStore.getState().project.title).toBe(
        'Match One',
      );
    });

    rerender({ matchId: 'm2' });
    await waitFor(() => {
      const p = useTacticalUnifiedStore.getState().project;
      expect(p.title).not.toBe('Match One');
      expect(p.matchId).not.toBe('m1');
    });
  });

  it('変更は matchId 専用キーに保存される', async () => {
    useTacticalUnifiedStore.getState().loadProject(projectFor('m2', 'Two'));
    renderHook(() => useTacticalAutoSave({ matchId: 'm2', skipRestore: true }));

    act(() => {
      useTacticalUnifiedStore.setState((s) => ({
        project: { ...s.project, title: 'Two Edited' },
        isDirty: true,
      }));
    });

    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m2'))?.title).toBe('Two Edited');
      },
      { timeout: 3000 },
    );
    expect(await loadActiveProjectFromDb('m1')).toBeNull();
    expect(await loadActiveProjectFromDb()).toBeNull();
  });
```
**After:**
```ts
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { db } from '@/lib/db/schema';
import {
  getTacticalProjectStorageKey,
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { useTacticalAutoSave } from '../use-tactical-auto-save';

function projectFor(matchId: string, title: string): DomainTacticalProject {
  return {
    ...createDefaultTacticalProject(),
    id: `proj-${matchId}`,
    matchId,
    title,
  };
}

function createAutoSaveHarness(initialProject?: DomainTacticalProject) {
  const project = initialProject ?? createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return { documentStore, sessionStore, playbackStore, wrapper };
}

describe('useTacticalAutoSave (試合別)', () => {
  beforeEach(async () => {
    await db.keyval.delete(getTacticalProjectStorageKey('m1'));
    await db.keyval.delete(getTacticalProjectStorageKey('m2'));
  });

  it('matchId ごとに復元され、保存のない試合は前試合を引き継がない', async () => {
    await saveActiveProjectToDb(projectFor('m1', 'Match One'), 'm1');
    const { documentStore, wrapper } = createAutoSaveHarness();

    const { rerender } = renderHook(
      ({ matchId }) => useTacticalAutoSave({ matchId }),
      { initialProps: { matchId: 'm1' }, wrapper },
    );
    await waitFor(() => {
      expect(documentStore.getState().project.title).toBe('Match One');
    });

    rerender({ matchId: 'm2' });
    await waitFor(() => {
      const p = documentStore.getState().project;
      expect(p.title).not.toBe('Match One');
      expect(p.matchId).not.toBe('m1');
    });
  });

  it('変更は matchId 専用キーに保存される', async () => {
    const { documentStore, wrapper } = createAutoSaveHarness(
      projectFor('m2', 'Two'),
    );
    renderHook(() => useTacticalAutoSave({ matchId: 'm2', skipRestore: true }), {
      wrapper,
    });

    act(() => {
      documentStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Two Edited' },
      });
    });

    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m2'))?.title).toBe('Two Edited');
      },
      { timeout: 3000 },
    );
    expect(await loadActiveProjectFromDb('m1')).toBeNull();
    expect(await loadActiveProjectFromDb()).toBeNull();
  });
```

**Before:**
```ts
  it('matchId なし（単独用）マウント時にストア内に matchId が残っていれば resetProject で初期化される', async () => {
    // ストアに試合用プロジェクトが残存している状態をシミュレート
    useTacticalUnifiedStore
      .getState()
      .loadProject(projectFor('m1', 'Match Remnant'));
    expect(useTacticalUnifiedStore.getState().project.matchId).toBe('m1');

    // matchId なしで useTacticalAutoSave をマウント
    renderHook(() => useTacticalAutoSave({ matchId: null }));

    await waitFor(() => {
      const p = useTacticalUnifiedStore.getState().project;
      expect(p.matchId).toBeUndefined();
      expect(p.title).not.toBe('Match Remnant');
    });
  });

  it('pointerdown 中は isDirty でも saving を発火せず、pointerup 後に saving -> saved へ遷移する', async () => {
    useTacticalUnifiedStore.getState().loadProject(projectFor('m1', 'One'));
    renderHook(() => useTacticalAutoSave({ matchId: 'm1', skipRestore: true }));

    // pointerdown を発火（ドラッグ中）
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'));
    });

    // 変更が発生して isDirty: true
    act(() => {
      useTacticalUnifiedStore.setState((s) => ({
        project: { ...s.project, title: 'One During Drag' },
        isDirty: true,
      }));
    });

    // ドラッグ中は saving に遷移せず、idle のまま
    expect(useTacticalUnifiedStore.getState().saveStatus).not.toBe('saving');

    // pointerup を発火（ドラッグ完了）
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    // pointerup 後に saving -> saved へ遷移し、DB に保存される
    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m1'))?.title).toBe(
          'One During Drag',
        );
        expect(useTacticalUnifiedStore.getState().saveStatus).toBe('saved');
      },
      { timeout: 3000 },
    );
  });
});
```
**After:**
```ts
  it('matchId なし（単独用）マウント時にストア内に matchId が残っていれば新規プロジェクトで初期化される', async () => {
    const { documentStore, wrapper } = createAutoSaveHarness(
      projectFor('m1', 'Match Remnant'),
    );
    expect(documentStore.getState().project.matchId).toBe('m1');

    renderHook(() => useTacticalAutoSave({ matchId: null }), { wrapper });

    await waitFor(() => {
      const p = documentStore.getState().project;
      expect(p.matchId).toBeUndefined();
      expect(p.title).not.toBe('Match Remnant');
    });
  });

  it('pointerdown 中は isDirty でも saving を発火せず、pointerup 後に saving -> saved へ遷移する', async () => {
    const { documentStore, sessionStore, wrapper } = createAutoSaveHarness(
      projectFor('m1', 'One'),
    );
    renderHook(() => useTacticalAutoSave({ matchId: 'm1', skipRestore: true }), {
      wrapper,
    });

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerdown'));
    });

    act(() => {
      documentStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'One During Drag' },
      });
    });

    expect(sessionStore.getState().saveStatus).not.toBe('saving');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup'));
    });

    await waitFor(
      async () => {
        expect((await loadActiveProjectFromDb('m1'))?.title).toBe(
          'One During Drag',
        );
        expect(sessionStore.getState().saveStatus).toBe('saved');
      },
      { timeout: 3000 },
    );
  });
});
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`

**Before:**
```ts
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { db } from '@/lib/db';
import type { Match, Player, Team } from '@/types';
import {
  resolveMatchInitialState,
  useTacticalMatchInit,
} from '../use-tactical-match-init';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => null),
}));

describe('useTacticalMatchInit', () => {
```
**After:**
```ts
import { renderHook, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { db } from '@/lib/db';
import type { Match, Player, Team } from '@/types';
import {
  resolveMatchInitialState,
  useTacticalMatchInit,
} from '../use-tactical-match-init';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => null),
}));

function createMatchInitHarness() {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    React.createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return { documentStore, sessionStore, playbackStore, wrapper };
}

describe('useTacticalMatchInit', () => {
```

**Before:**
```ts
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    vi.clearAllMocks();
  });

  it('does nothing when no matchId is provided', () => {
    const { result } = renderHook(() => useTacticalMatchInit());
    expect(result.current.hasMatchQuery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches match from db and initializes tactical canvas with 22 players', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const { result } = renderHook(() =>
      useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const state = useTacticalUnifiedStore.getState();
    expect(state.project.matchId).toBe('999');
    expect(state.project.title).toContain("Home FC vs Away FC (25')");

    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('injects match into custom storeApi when provided by context', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const customStore = createTacticalUnifiedStore();
    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      {
        wrapper: ({ children }) =>
          React.createElement(TacticalUnifiedStoreProvider, {
            store: customStore,
            children,
          }),
      },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Custom store must be populated
    expect(customStore.getState().project.matchId).toBe('999');
    expect(customStore.getState().project.title).toContain(
      "Home FC vs Away FC (25')",
    );

    // Default store must NOT be polluted
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });

  it('injectToStore: false resolves initialState without modifying storeApi', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const { result } = renderHook(() =>
      useTacticalMatchInit({
        initialMatchId: '999',
        initialMinute: 25,
        injectToStore: false,
      }),
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // initialState must be resolved
    expect(result.current.initialState).toBeDefined();
    expect(result.current.initialState?.project?.matchId).toBe('999');
    const activeSlideId = result.current.initialState?.activeSlideId;
    const activeSlide = result.current.initialState?.project?.slides.find(
      (s) => s.id === activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);

    // Global store must remain empty/unmodified
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });
```
**After:**
```ts
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does nothing when no matchId is provided', () => {
    const { wrapper } = createMatchInitHarness();
    const { result } = renderHook(() => useTacticalMatchInit(), { wrapper });
    expect(result.current.hasMatchQuery).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches match from db and initializes tactical canvas with 22 players', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);
    const { documentStore, sessionStore, wrapper } = createMatchInitHarness();

    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      { wrapper },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const project = documentStore.getState().project;
    expect(project.matchId).toBe('999');
    expect(project.title).toContain("Home FC vs Away FC (25')");

    const { activePhaseId, activeSlideId } = sessionStore.getState();
    const activeSlide = selectDomainActiveSlide(
      project,
      activePhaseId,
      activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('injects match into isolated TacticalStoreProvider stores without polluting sibling stores', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const customHarness = createMatchInitHarness();
    const otherHarness = createMatchInitHarness();
    const { result } = renderHook(
      () => useTacticalMatchInit({ initialMatchId: '999', initialMinute: 25 }),
      { wrapper: customHarness.wrapper },
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(customHarness.documentStore.getState().project.matchId).toBe('999');
    expect(customHarness.documentStore.getState().project.title).toContain(
      "Home FC vs Away FC (25')",
    );
    expect(
      otherHarness.documentStore.getState().project.matchId,
    ).toBeUndefined();
  });

  it('injectToStore: false resolves initialState without modifying stores or outside provider', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);

    const { result } = renderHook(() =>
      useTacticalMatchInit({
        initialMatchId: '999',
        initialMinute: 25,
        injectToStore: false,
      }),
    );

    expect(result.current.hasMatchQuery).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.initialState).toBeDefined();
    expect(result.current.initialState?.project.matchId).toBe('999');
    const resolved = result.current.initialState;
    const activeSlide = resolved
      ? selectDomainActiveSlide(
          resolved.project,
          resolved.activePhaseId,
          resolved.activeSlideId,
        )
      : undefined;
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
```

**Before:**
```ts
    const result = await resolveMatchInitialState('999', 30);
    expect(result).toBeDefined();
    expect(result?.pitchFitPending).toBe(false);
    expect(result?.project?.matchId).toBe('999');
    expect(result?.project?.title).toContain("Home FC vs Away FC (30')");

    const activeSlide = result?.project?.slides.find(
      (s) => s.id === result.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('ignores saved project in db and always generates fresh match initial state for given minute', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);
    vi.spyOn(db.keyval, 'get').mockResolvedValueOnce({
      key: 'footics_tactical_active_project_999',
      value: {
        id: 'saved-project-1',
        title: 'Saved Match Project',
        matchId: '999',
        phases: [{ id: 'phase-1', name: 'Phase 1', slides: [] }],
        slides: [],
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      },
    } as any);

    const result = await resolveMatchInitialState('999', 45);
    expect(result).toBeDefined();
    expect(result?.pitchFitPending).toBe(false);
    expect(result?.project?.id).not.toBe('saved-project-1');
    expect(result?.project?.matchId).toBe('999');
    expect(result?.project?.title).toContain("Home FC vs Away FC (45')");

    const activeSlide = result?.project?.slides.find(
      (s) => s.id === result.activeSlideId,
    );
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
```
**After:**
```ts
    const result = await resolveMatchInitialState('999', 30);
    expect(result).toBeDefined();
    expect(result?.project.matchId).toBe('999');
    expect(result?.project.title).toContain("Home FC vs Away FC (30')");

    const activeSlide = result
      ? selectDomainActiveSlide(
          result.project,
          result.activePhaseId,
          result.activeSlideId,
        )
      : undefined;
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });

  it('ignores saved project in db and always generates fresh match initial state for given minute', async () => {
    vi.spyOn(db.matches, 'get').mockResolvedValueOnce(mockMatch);
    vi.spyOn(db.keyval, 'get').mockResolvedValueOnce({
      key: 'footics_tactical_active_project_999',
      value: {
        id: 'saved-project-1',
        title: 'Saved Match Project',
        matchId: '999',
        phases: [{ id: 'phase-1', name: 'Phase 1', slides: [] }],
        slides: [],
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      },
    } as any);

    const result = await resolveMatchInitialState('999', 45);
    expect(result).toBeDefined();
    expect(result?.project.id).not.toBe('saved-project-1');
    expect(result?.project.matchId).toBe('999');
    expect(result?.project.title).toContain("Home FC vs Away FC (45')");

    const activeSlide = result
      ? selectDomainActiveSlide(
          result.project,
          result.activePhaseId,
          result.activeSlideId,
        )
      : undefined;
    const pitchPlayers =
      activeSlide?.players.filter((p) => p.area === 'pitch') ?? [];
    expect(pitchPlayers).toHaveLength(22);
  });
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/__tests__/use-tactical-auto-save-match.test.ts src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts
```
