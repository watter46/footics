# TASK-181ja: 3周波数ストア拡張・Provider強化・純粋Domainセレクタ新設

- **Status**: DONE
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): add store save/playback state glue, default 22 players, and pure domain selectors`

---

## 🎯 目的・背景

以降の UI パネル／ツールバー／ダイアログ／AutoSave 移行に先立ち、新3周波数ストア（`DocumentStore` / `SessionStore` / `PlaybackStore`）および `TacticalStoreProvider` に不足している状態・アクション・純粋セレクタを整備する。

## 🚨 残存禁止条件 (Negative Contracts)

- `domain-selectors.ts` は `TacticalProject` / `TacticalPhase` / `Slide`（Legacy型）を一切 import してはならない。
- 新設・更新するテストで `vi.mock` による内部ストア・内部フックのモックを行ってはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `DocumentStore` / `SessionStore` / `PlaybackStore` 不足状態・アクション追加（4プロダクション + 1テスト）
- **Phase 2**: `TacticalStoreProvider` デフォルト22選手化・Session ID 自動初期化 & `domain-selectors.ts` 新設（2プロダクション + 1テスト）

---

### Phase 1: 3周波数ストア拡張 (`DocumentStore` / `SessionStore` / `PlaybackStore`)

- **担当ファイル**:
  - `src/features/tactical-unified/stores/document-store.ts`
  - `src/features/tactical-unified/stores/session-ui-state.ts`
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/features/tactical-unified/stores/playback-store.ts`
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/stores/document-store.ts`

**Before:**
```ts
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly loadProject: (project: DomainTacticalProject) => void;
}
```
**After:**
```ts
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly loadProject: (project: DomainTacticalProject) => void;
  readonly markSaved: () => void;
}
```

**Before:**
```ts
    loadProject: (project: DomainTacticalProject) => {
      set({
        project,
        past: [],
        future: [],
        isDirty: false,
      });
    },
  }));
}
```
**After:**
```ts
    loadProject: (project: DomainTacticalProject) => {
      set({
        project,
        past: [],
        future: [],
        isDirty: false,
      });
    },

    markSaved: () => {
      set({ isDirty: false });
    },
  }));
}
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts`

**Before:**
```ts
export type TeamVisibility = 'both' | 'home' | 'away';
export type MarkerMode = '2d-only' | '3d-only' | 'all';

export interface SavedPanelState {
```
**After:**
```ts
export type TeamVisibility = 'both' | 'home' | 'away';
export type MarkerMode = '2d-only' | '3d-only' | 'all';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SavedPanelState {
```

**Before:**
```ts
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
```
**After:**
```ts
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
  readonly saveStatus: SaveStatus;
  readonly lastSavedAt: number | null;
  readonly isExporting: boolean;
  readonly stageAspect: number | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
```

**Before:**
```ts
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
};
```
**After:**
```ts
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
  saveStatus: 'idle',
  lastSavedAt: null,
  isExporting: false,
  stageAspect: null,
};
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts`

**Before:**
```ts
  type RightPanelTab,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
```
**After:**
```ts
  type RightPanelTab,
  type SaveStatus,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
```

**Before:**
```ts
  readonly openProjectManagerModal: () => void;
  readonly closeProjectManagerModal: () => void;
}
```
**After:**
```ts
  readonly openProjectManagerModal: () => void;
  readonly closeProjectManagerModal: () => void;
  readonly setSaveStatus: (status: SaveStatus) => void;
  readonly setLastSavedAt: (timestamp: number | null) => void;
  readonly setIsExporting: (exporting: boolean) => void;
  readonly setStageAspect: (aspect: number | null) => void;
}
```

**Before:**
```ts
    openProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: true } })),
    closeProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: false } })),
  }));
}
```
**After:**
```ts
    openProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: true } })),
    closeProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: false } })),
    setSaveStatus: (saveStatus) => set({ saveStatus }),
    setLastSavedAt: (lastSavedAt) => set({ lastSavedAt }),
    setIsExporting: (isExporting) => set({ isExporting }),
    setStageAspect: (stageAspect) => set({ stageAspect }),
  }));
}
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/stores/playback-store.ts`

**Before:**
```ts
export interface PlaybackStoreState {
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;

  readonly startPlayback: () => void;
  readonly pausePlayback: () => void;
  readonly stopPlayback: () => void;
  readonly seekTo: (timeMs: number | Milliseconds) => void;
  readonly setTimeMs: (timeMs: number | Milliseconds) => void;
}

export type PlaybackStore = StoreApi<PlaybackStoreState>;

export function createPlaybackStore(
  initialTimeMs?: Milliseconds,
): PlaybackStore {
  return createStore<PlaybackStoreState>((set) => ({
    isPlaying: false,
    timeMs: initialTimeMs ?? toMilliseconds(0),

    startPlayback: () => set({ isPlaying: true }),

    pausePlayback: () => set({ isPlaying: false }),

    stopPlayback: () =>
      set({
        isPlaying: false,
        timeMs: toMilliseconds(0),
      }),
```
**After:**
```ts
export interface PlaybackStoreState {
  readonly isPlaying: boolean;
  readonly timeMs: Milliseconds;
  readonly playbackSlideIndex: number;
  readonly playbackTransitionIndex: number | null;

  readonly startPlayback: () => void;
  readonly pausePlayback: () => void;
  readonly stopPlayback: () => void;
  readonly togglePlayback: () => void;
  readonly seekTo: (timeMs: number | Milliseconds) => void;
  readonly setTimeMs: (timeMs: number | Milliseconds) => void;
  readonly setPlaybackIndices: (
    slideIndex: number,
    transitionIndex: number | null,
  ) => void;
}

export type PlaybackStore = StoreApi<PlaybackStoreState>;

export function createPlaybackStore(
  initialTimeMs?: Milliseconds,
): PlaybackStore {
  return createStore<PlaybackStoreState>((set) => ({
    isPlaying: false,
    timeMs: initialTimeMs ?? toMilliseconds(0),
    playbackSlideIndex: 0,
    playbackTransitionIndex: null,

    startPlayback: () => set({ isPlaying: true }),

    pausePlayback: () => set({ isPlaying: false }),

    stopPlayback: () =>
      set({
        isPlaying: false,
        timeMs: toMilliseconds(0),
        playbackSlideIndex: 0,
        playbackTransitionIndex: null,
      }),

    togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
```

**Before:**
```ts
    setTimeMs: (timeMs: number | Milliseconds) =>
      set({
        timeMs: toMilliseconds(Math.max(0, Number(timeMs))),
      }),
  }));
}
```
**After:**
```ts
    setTimeMs: (timeMs: number | Milliseconds) =>
      set({
        timeMs: toMilliseconds(Math.max(0, Number(timeMs))),
      }),

    setPlaybackIndices: (
      playbackSlideIndex: number,
      playbackTransitionIndex: number | null,
    ) => set({ playbackSlideIndex, playbackTransitionIndex }),
  }));
}
```

#### Task 1.5 `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

**Before:**
```ts
      // Document のみ更新
      act(() => {
        docStore.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: 'Provider Updated' },
        });
      });
      expect(result.current.title).toBe('Provider Updated');
    });
  });
});
```
**After:**
```ts
      // Document のみ更新
      act(() => {
        docStore.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: 'Provider Updated' },
        });
      });
      expect(result.current.title).toBe('Provider Updated');
    });

    it('supports markSaved, session saveStatus/exporting state, and playback indices', () => {
      const docStore = createDocumentStore(createDummyProject());
      const sessStore = createSessionStore();
      const playStore = createPlaybackStore();

      docStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Dirty Title' },
      });
      expect(docStore.getState().isDirty).toBe(true);
      docStore.getState().markSaved();
      expect(docStore.getState().isDirty).toBe(false);

      sessStore.getState().setSaveStatus('saving');
      sessStore.getState().setLastSavedAt(1700000000000);
      sessStore.getState().setIsExporting(true);
      sessStore.getState().setStageAspect(1.777);
      expect(sessStore.getState().saveStatus).toBe('saving');
      expect(sessStore.getState().lastSavedAt).toBe(1700000000000);
      expect(sessStore.getState().isExporting).toBe(true);
      expect(sessStore.getState().stageAspect).toBe(1.777);

      playStore.getState().togglePlayback();
      playStore.getState().setPlaybackIndices(2, 1);
      expect(playStore.getState().isPlaying).toBe(true);
      expect(playStore.getState().playbackSlideIndex).toBe(2);
      expect(playStore.getState().playbackTransitionIndex).toBe(1);
      playStore.getState().stopPlayback();
      expect(playStore.getState().isPlaying).toBe(false);
      expect(playStore.getState().playbackSlideIndex).toBe(0);
      expect(playStore.getState().playbackTransitionIndex).toBeNull();
    });
  });
});
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/stores/document-store.ts src/features/tactical-unified/stores/session-ui-state.ts src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/stores/playback-store.ts src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts
  ```

---

### Phase 2: Provider デフォルトプロジェクト強化 & 純粋 Domain セレクタ新設

- **担当ファイル**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/features/tactical-unified/stores/domain-selectors.ts` (`[ADD]`)
  - `src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts` (`[ADD]`)

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/stores/tactical-store-provider.tsx`

**Before:**
```ts
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import type { Milliseconds } from '@/lib/types/tactical/branded';
```
**After:**
```ts
import { createContext, type ReactNode, useContext, useRef } from 'react';
import { useStore } from 'zustand';
import { createDefaultDomainPlayers } from '@/lib/tactical/domain/default-players';
import type { Milliseconds } from '@/lib/types/tactical/branded';
```

**Before:**
```ts
function createDefaultTacticalProject(): DomainTacticalProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
```
**After:**
```ts
export function createDefaultTacticalProject(): DomainTacticalProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
```

**Before:**
```ts
          {
            id: crypto.randomUUID(),
            index: 0,
            label: 'Scene 1',
            players: [],
            arrows: [],
```
**After:**
```ts
          {
            id: crypto.randomUUID(),
            index: 0,
            label: 'Scene 1',
            players: createDefaultDomainPlayers('#034694', '#ef4444', '4:5'),
            arrows: [],
```

**Before:**
```ts
  if (!storesRef.current) {
    const documentStore =
      stores?.documentStore ??
      createDocumentStore(initialProject ?? createDefaultTacticalProject());
    const sessionStore =
      stores?.sessionStore ?? createSessionStore(initialSession);
    const playbackStore =
      stores?.playbackStore ?? createPlaybackStore(initialTimeMs);
```
**After:**
```ts
  if (!storesRef.current) {
    const documentStore =
      stores?.documentStore ??
      createDocumentStore(initialProject ?? createDefaultTacticalProject());
    const resolvedProject = documentStore.getState().project;
    const defaultPhase = resolvedProject.phases[0];
    const defaultSlide = defaultPhase?.slides[0];
    const sessionStore =
      stores?.sessionStore ??
      createSessionStore({
        ...initialSession,
        activePhaseId:
          initialSession?.activePhaseId || defaultPhase?.id || '',
        activeSlideId:
          initialSession?.activeSlideId || defaultSlide?.id || '',
      });
    const playbackStore =
      stores?.playbackStore ?? createPlaybackStore(initialTimeMs);
```

#### Task 2.2 `[ADD]` `src/features/tactical-unified/stores/domain-selectors.ts`

```ts
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  type AspectRatio,
  type BoundaryBox,
  DEFAULT_BOUNDARY_BOX_4_5,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical/slide';
import type { SelectedObject, TeamVisibility } from './session-ui-state';

export interface DomainRenderSnapshot {
  readonly activePhase: DomainTacticalPhase | undefined;
  readonly slides: readonly DomainSlide[];
  readonly activeSlide: DomainSlide | undefined;
  readonly aspectRatio: AspectRatio;
  readonly boundaryBox: BoundaryBox;
  readonly pitchTransform: PitchTransform | null;
  readonly directorCamera: DirectorCameraTrack | null;
  readonly pitchAppearance: PitchAppearanceConfig;
  readonly screenBackground: ScreenBackgroundConfig;
  readonly teamVisibility: TeamVisibility;
}

export function selectDomainActivePhase(
  project: DomainTacticalProject,
  activePhaseId: string,
): DomainTacticalPhase | undefined {
  const { phases } = project;
  if (!phases || phases.length === 0) return undefined;
  return phases.find((p) => p.id === activePhaseId) ?? phases[0];
}

export function selectDomainActivePhaseSlides(
  project: DomainTacticalProject,
  activePhaseId: string,
): readonly DomainSlide[] {
  return selectDomainActivePhase(project, activePhaseId)?.slides ?? [];
}

export function selectDomainActiveSlide(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
): DomainSlide | undefined {
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const inActive = activePhase?.slides.find((sl) => sl.id === activeSlideId);
  if (inActive) return inActive;
  for (const phase of project.phases) {
    const found = phase.slides.find((sl) => sl.id === activeSlideId);
    if (found) return found;
  }
  return activePhase?.slides[0];
}

export function selectDomainPreviousSlide(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
): DomainSlide | null {
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const idx = slides.findIndex((sl) => sl.id === activeSlideId);
  return idx > 0 ? (slides[idx - 1] ?? null) : null;
}

export function selectDomainActivePhaseAspectRatio(
  project: DomainTacticalProject,
  activePhaseId: string,
): AspectRatio {
  return selectDomainActivePhase(project, activePhaseId)?.aspectRatio ?? '4:5';
}

export function selectDomainActiveBoundaryBox(
  project: DomainTacticalProject,
  activePhaseId: string,
): BoundaryBox {
  return selectDomainActivePhase(project, activePhaseId)?.boundaryBox ?? DEFAULT_BOUNDARY_BOX_4_5;
}

export function selectDomainRenderSnapshot(
  project: DomainTacticalProject,
  activePhaseId: string,
  activeSlideId: string,
  teamVisibility: TeamVisibility = 'both',
): DomainRenderSnapshot {
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const activeSlide = selectDomainActiveSlide(project, activePhaseId, activeSlideId);
  return {
    activePhase,
    slides: activePhase?.slides ?? [],
    activeSlide,
    aspectRatio: activePhase?.aspectRatio ?? '4:5',
    boundaryBox: activePhase?.boundaryBox ?? DEFAULT_BOUNDARY_BOX_4_5,
    pitchTransform: activeSlide?.pitchTransform ?? null,
    directorCamera: activePhase?.directorCamera ?? null,
    pitchAppearance: project.pitchAppearance,
    screenBackground: project.screenBackground,
    teamVisibility,
  };
}

export function selectDomainIsMultiSlide(project: DomainTacticalProject, activePhaseId: string): boolean {
  return selectDomainActivePhaseSlides(project, activePhaseId).length > 1;
}

export function selectDomainSingleSelectedId(selectedObjects: readonly SelectedObject[]): string | null {
  return selectedObjects.length === 1 ? (selectedObjects[0]?.id ?? null) : null;
}
```

#### Task 2.3 `[ADD]` `src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts`

```tsx
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActiveSlide,
  selectDomainIsMultiSlide,
  selectDomainPreviousSlide,
  selectDomainRenderSnapshot,
} from '../domain-selectors';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
  useSessionStore,
} from '../tactical-store-provider';

describe('domain-selectors and TacticalStoreProvider defaults', () => {
  it('createDefaultTacticalProject creates 22 pitch players and valid hierarchy', () => {
    const project = createDefaultTacticalProject();
    expect(project.version).toBe('3.0.0');
    expect(project.phases).toHaveLength(1);
    const slide = project.phases[0]?.slides[0];
    expect(slide?.players).toHaveLength(22);
    expect(slide?.players.filter((p) => p.team === 'home')).toHaveLength(11);
    expect(slide?.players.filter((p) => p.team === 'away')).toHaveLength(11);
  });

  it('TacticalStoreProvider initializes activePhaseId and activeSlideId from project when omitted', () => {
    const project = createDefaultTacticalProject();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider initialProject={project}>
        {children}
      </TacticalStoreProvider>
    );
    const { result } = renderHook(
      () => ({
        phaseId: useSessionStore((s) => s.activePhaseId),
        slideId: useSessionStore((s) => s.activeSlideId),
      }),
      { wrapper },
    );
    expect(result.current.phaseId).toBe(project.phases[0]?.id);
    expect(result.current.slideId).toBe(project.phases[0]?.slides[0]?.id);
  });

  it('selects active phase, slide, previous slide, boundaryBox, and snapshot', () => {
    const base = createDefaultTacticalProject();
    const phase1 = base.phases[0]!;
    const slide1 = phase1.slides[0]!;
    const slide2 = { ...slide1, id: 'slide-2', index: 1, label: 'Scene 2' };
    const project = {
      ...base,
      phases: [{ ...phase1, aspectRatio: '16:9' as const, slides: [slide1, slide2] }],
    };

    expect(selectDomainActivePhase(project, phase1.id)?.id).toBe(phase1.id);
    expect(selectDomainActivePhase(project, 'missing')?.id).toBe(phase1.id);
    expect(selectDomainActiveSlide(project, phase1.id, 'slide-2')?.id).toBe('slide-2');
    expect(selectDomainPreviousSlide(project, phase1.id, slide1.id)).toBeNull();
    expect(selectDomainPreviousSlide(project, phase1.id, 'slide-2')?.id).toBe(slide1.id);
    expect(selectDomainActivePhaseAspectRatio(project, phase1.id)).toBe('16:9');
    expect(selectDomainActiveBoundaryBox(project, phase1.id)).toEqual(phase1.boundaryBox);
    expect(selectDomainIsMultiSlide(project, phase1.id)).toBe(true);

    const snapshot = selectDomainRenderSnapshot(project, phase1.id, 'slide-2', 'home');
    expect(snapshot.activeSlide?.id).toBe('slide-2');
    expect(snapshot.slides).toHaveLength(2);
    expect(snapshot.teamVisibility).toBe('home');
  });
});
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/stores/tactical-store-provider.tsx src/features/tactical-unified/stores/domain-selectors.ts src/features/tactical-unified/stores/__tests__/domain-selectors.test.ts
  ```
