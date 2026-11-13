# TASK-181jd: TimelineBar・PlaybackControls・AddSlideButton・DirectorCameraTimeline 移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): migrate TimelineBar, PlaybackControls, AddSlideButton, DirectorCameraTimeline and tests to 3-frequency stores`

---

## 🎯 目的・背景

`panels/timeline/` の主要コンテナ群（`AddSlideButton`, `PlaybackControls`, `DirectorCameraTimeline`, `TimelineBar`）と対応テスト 2 本を `DocumentStore` / `SessionStore` / `PlaybackStore` へ移行し、Timeline サブシステムからの Legacy ストア依存を完全に解消する。

## 🚨 残存禁止条件 (Negative Contracts)

- `panels/timeline/` 配下の全ファイルに `useTacticalUnifiedStore` / `tactical-unified-store` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` の import が 1 件も残存してはならない。
- テスト内で `vi.mock` による内部ストアモックを行ってはならない（実 `createDocumentStore` / `createSessionStore` / `createPlaybackStore` + `TacticalStoreProvider` を使用）。

---

## 🏗️ Phase 構成

- **Phase 1**: 4プロダクションコンポーネント移行 + 2テスト更新（4プロダクション + 2テスト）

---

### Phase 1: Timeline コンテナ・再生コントロール・テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/timeline/add-slide-button.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/timeline/add-slide-button.tsx`

**Before:**
```tsx
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

const ITEM_CLASS = 'items-start gap-2 px-2 py-2';

export function AddSlideButton() {
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const addSlide = useTacticalUnifiedStoreContext((s) => s.addSlide);

  const handleLeftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    addSlide(activeSlideId, 'blank');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addSlide(activeSlideId, 'full');
  };
```
**After:**
```tsx
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

const ITEM_CLASS = 'items-start gap-2 px-2 py-2';

export function AddSlideButton() {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const dispatch = useDocumentStore((s) => s.dispatch);

  const handleAddSlide = (mode: 'blank' | 'full' | 'object-free') => {
    const newSlideId = crypto.randomUUID();
    dispatch({
      type: 'ADD_SLIDE',
      phaseId: activePhaseId,
      afterSlideId: activeSlideId || undefined,
      mode,
      newSlideId,
    });
    setActiveSlideId(newSlideId);
  };

  const handleLeftClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleAddSlide('blank');
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddSlide('full');
  };
```

**Before:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'blank')}
              >
```
**After:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => handleAddSlide('blank')}
              >
```

**Before:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'full')}
              >
```
**After:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => handleAddSlide('full')}
              >
```

**Before:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => addSlide(activeSlideId, 'object-free')}
              >
```
**After:**
```tsx
              <DropdownMenuItem
                className={ITEM_CLASS}
                onClick={() => handleAddSlide('object-free')}
              >
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/timeline/playback-controls.tsx`

**Before:**
```tsx
import { Pause, Play } from 'lucide-react';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';

export function PlaybackControls() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );
```
**After:**
```tsx
import { Pause, Play } from 'lucide-react';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';

export function PlaybackControls() {
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const togglePlayback = usePlaybackStore((s) => s.togglePlayback);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`

**Before:**
```tsx
import { useCallback, useState } from 'react';
import {
  selectActivePhase,
  selectActivePhaseSlides,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);
  const deleteGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.deleteGlobalCameraKeyframe,
  );
  const deleteActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.deleteActionCameraCue,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );

  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));
  const currentTimeMs = Math.min(
    totalDurationMs,
    Math.max(0, playbackSeekTimeMs ?? 0),
  );
  const directorCamera = activePhase?.directorCamera;
  const globalKeyframes = directorCamera?.globalKeyframes ?? [];
  const actionCues = directorCamera?.actionCues ?? [];
```
**After:**
```tsx
import { useCallback, useState } from 'react';
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import { DirectorActionTrack } from './director-action-track';
import { DirectorGlobalTrack } from './director-global-track';

export function DirectorCameraTimeline() {
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const timeMs = usePlaybackStore((s) => s.timeMs);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const slides = activePhase?.slides ?? [];

  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>(null);
  const [selectedCueId, setSelectedCueId] = useState<string | null>(null);

  const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));
  const currentTimeMs = Math.min(totalDurationMs, Math.max(0, Number(timeMs)));
  const directorCamera = activePhase?.directorCamera;
  const globalKeyframes = directorCamera?.globalKeyframes ?? [];
  const actionCues = directorCamera?.actionCues ?? [];
```

**Before:**
```tsx
  const handleUpdateCueDuration = useCallback(
    (cue: (typeof actionCues)[number], durationMs: number) => {
      upsertActionCameraCue(cue.startTimeMs, { durationMs }, cue.id);
    },
    [upsertActionCameraCue],
  );
```
**After:**
```tsx
  const handleUpdateCueDuration = useCallback(
    (cue: (typeof actionCues)[number], durationMs: number) => {
      dispatch({
        type: 'UPSERT_ACTION_CAMERA_CUE',
        phaseId: activePhaseId,
        startTimeMs: cue.startTimeMs,
        patch: { durationMs },
        cueId: cue.id,
      });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteKeyframe = useCallback(
    (keyframeId: string) => {
      dispatch({
        type: 'DELETE_GLOBAL_CAMERA_KEYFRAME',
        phaseId: activePhaseId,
        keyframeId,
      });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteCue = useCallback(
    (cueId: string) => {
      dispatch({
        type: 'DELETE_ACTION_CAMERA_CUE',
        phaseId: activePhaseId,
        cueId,
      });
    },
    [dispatch, activePhaseId],
  );
```

**Before:**
```tsx
        onDeleteKeyframe={deleteGlobalCameraKeyframe}
      />

      {/* 下段: ② アクションカメラトラック */}
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={selectedCueId}
        totalDurationMs={totalDurationMs}
        currentTimeMs={currentTimeMs}
        onSelectCue={handleSelectCue}
        onUpdateDuration={handleUpdateCueDuration}
        onDeleteCue={deleteActionCameraCue}
        onSeek={seekTo}
      />
```
**After:**
```tsx
        onDeleteKeyframe={handleDeleteKeyframe}
      />

      {/* 下段: ② アクションカメラトラック */}
      <DirectorActionTrack
        actionCues={actionCues}
        selectedCueId={selectedCueId}
        totalDurationMs={totalDurationMs}
        currentTimeMs={currentTimeMs}
        onSelectCue={handleSelectCue}
        onUpdateDuration={handleUpdateCueDuration}
        onDeleteCue={handleDeleteCue}
        onSeek={seekTo}
      />
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`

**Before:**
```tsx
import { ActionButton } from '@/components/ui/action-button';
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { AddSlideButton } from './add-slide-button';
```
**After:**
```tsx
import { ActionButton } from '@/components/ui/action-button';
import { getSlideSnapTime } from '@/features/tactical-unified/hooks/tactical-playback-controls';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { AddSlideButton } from './add-slide-button';
```

**Before:**
```tsx
export function TimelineBar() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const playbackSlideIndex = useTacticalUnifiedStoreContext(
    (s) => s.playbackSlideIndex,
  );
  const playbackTransitionIndex = useTacticalUnifiedStoreContext(
    (s) => s.playbackTransitionIndex,
  );
  const setActiveSlide = useTacticalUnifiedStoreContext(
    (s) => s.setActiveSlide,
  );
  const setPlaybackIndices = useTacticalUnifiedStoreContext(
    (s) => s.setPlaybackIndices,
  );
  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);
  const deleteSlide = useTacticalUnifiedStoreContext((s) => s.deleteSlide);
  const duplicateSlide = useTacticalUnifiedStoreContext(
    (s) => s.duplicateSlide,
  );
  const reorderSlides = useTacticalUnifiedStoreContext((s) => s.reorderSlides);
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
```
**After:**
```tsx
export function TimelineBar() {
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const playbackSlideIndex = usePlaybackStore((s) => s.playbackSlideIndex);
  const playbackTransitionIndex = usePlaybackStore(
    (s) => s.playbackTransitionIndex,
  );
  const setPlaybackIndices = usePlaybackStore((s) => s.setPlaybackIndices);
  const seekTo = usePlaybackStore((s) => s.seekTo);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);

  const reorderSlides = useCallback(
    (slideIds: string[]) => {
      dispatch({ type: 'REORDER_SLIDES', phaseId: activePhaseId, slideIds });
    },
    [dispatch, activePhaseId],
  );

  const handleDeleteSlide = useCallback(
    (slideId: string) => {
      const remaining = slides.filter((s) => s.id !== slideId);
      const deletedIdx = slides.findIndex((s) => s.id === slideId);
      dispatch({ type: 'DELETE_SLIDE', phaseId: activePhaseId, slideId });
      if (activeSlideId === slideId && remaining.length > 0) {
        const nextSlide =
          remaining[Math.max(0, deletedIdx - 1)] ?? remaining[0];
        if (nextSlide) setActiveSlideId(nextSlide.id);
      }
    },
    [slides, dispatch, activePhaseId, activeSlideId, setActiveSlideId],
  );

  const handleDuplicateSlide = useCallback(
    (slideId: string) => {
      const newSlideId = crypto.randomUUID();
      dispatch({
        type: 'DUPLICATE_SLIDE',
        phaseId: activePhaseId,
        slideId,
        newSlideId,
      });
      setActiveSlideId(newSlideId);
    },
    [dispatch, activePhaseId, setActiveSlideId],
  );
```

**Before:**
```tsx
  const handleSelectSlide = useCallback(
    (slideId: string) => {
      setActiveSlide(slideId);
      const targetIndex = slides.findIndex((s) => s.id === slideId);
      if (targetIndex !== -1) {
        setPlaybackIndices(targetIndex, null);
        const startTimeMs = getSlideSnapTime(slides, targetIndex);
        seekTo(startTimeMs);
      }
    },
    [slides, setActiveSlide, setPlaybackIndices, seekTo],
  );
```
**After:**
```tsx
  const handleSelectSlide = useCallback(
    (slideId: string) => {
      setActiveSlideId(slideId);
      const targetIndex = slides.findIndex((s) => s.id === slideId);
      if (targetIndex !== -1) {
        setPlaybackIndices(targetIndex, null);
        const startTimeMs = getSlideSnapTime(slides, targetIndex);
        seekTo(startTimeMs);
      }
    },
    [slides, setActiveSlideId, setPlaybackIndices, seekTo],
  );
```

**Before:**
```tsx
                    onSelect={handleSelectSlide}
                    onDelete={deleteSlide}
                    onDuplicate={duplicateSlide}
                    onMoveLeft={() => handleMoveSlide(i, 'left')}
```
**After:**
```tsx
                    onSelect={handleSelectSlide}
                    onDelete={handleDeleteSlide}
                    onDuplicate={handleDuplicateSlide}
                    onMoveLeft={() => handleMoveSlide(i, 'left')}
```

#### Task 1.5 `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`

全テストを独立した `createDocumentStore` / `createSessionStore` / `createPlaybackStore` + `<TacticalStoreProvider>` 構成へ移行する。

**Before:**
```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TimelineBar } from '../timeline-bar';

describe('TimelineBar Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
  });

  it('renders playback controls and initial scene', () => {
    render(<TimelineBar />);
```
**After:**
```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TimelineBar } from '../timeline-bar';

function renderTimelineBar() {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]!.id;
  const slideId = project.phases[0]!.slides[0]!.id;
  const docStore = createDocumentStore(project);
  const sessStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playStore = createPlaybackStore();
  const view = render(
    <TacticalStoreProvider
      stores={{ documentStore: docStore, sessionStore: sessStore, playbackStore: playStore }}
    >
      <TimelineBar />
    </TacticalStoreProvider>,
  );
  const getSlides = () =>
    selectDomainActivePhaseSlides(
      docStore.getState().project,
      sessStore.getState().activePhaseId,
    );
  return { ...view, docStore, sessStore, playStore, getSlides };
}

describe('TimelineBar Component', () => {
  it('renders playback controls and initial scene', () => {
    renderTimelineBar();
```

注記: `timeline-bar.test.tsx` 内の全 `render(<TimelineBar />)` を `renderTimelineBar()` に置換し、`useTacticalUnifiedStore.getState()` 参照箇所（`project.slides` ➔ `getSlides()`, `activeSlideId` ➔ `sessStore.getState().activeSlideId`, `isPlaying` / `playbackSlideIndex` / `playbackTransitionIndex` ➔ `playStore.getState()`, `playbackSeekTimeMs` ➔ `playStore.getState().timeMs`, `reorderSlides` ➔ `docStore.getState().dispatch({ type: 'REORDER_SLIDES', phaseId: sessStore.getState().activePhaseId, slideIds })`, `undo()` ➔ `docStore.getState().undo()`, `setWorkspaceMode` ➔ `sessStore.getState().setWorkspaceMode`）へ置換すること。

#### Task 1.6 `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx`

`useTacticalUnifiedStore` を排除し、`createDocumentStore` / `createSessionStore` / `createPlaybackStore` + `<TacticalStoreProvider>` による独立テスト環境を構築する。

**Before:**
```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  DirectorActionTrack,
  layoutActionCuesIntoLanes,
} from '../director-action-track';
import { DirectorCameraTimeline } from '../director-camera-timeline';
import { TimelineBar } from '../timeline-bar';

describe('DirectorCameraTimeline Component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
    useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    // シーンを複数追加して totalDurationMs を確保 (例: 3シーンで 1000 + 500 + 1000 + 500 = 3000ms等)
    const addSlide = useTacticalUnifiedStore.getState().addSlide;
    addSlide();
    addSlide();
  });

  it('シークバー（director-scrubber-input）を value: 2000 に変更したとき、Store の playbackSeekTimeMs が 2000 に更新され、2.0s が表示されること', () => {
    render(<DirectorCameraTimeline />);

    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '2000' } });

    expect(useTacticalUnifiedStore.getState().playbackSeekTimeMs).toBe(2000);
    const timeDisplay = screen.getByTestId('director-scrubber-time');
    expect(timeDisplay.textContent).toBe('2.0s');
  });
```
**After:**
```tsx
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  DirectorActionTrack,
  layoutActionCuesIntoLanes,
} from '../director-action-track';
import { DirectorCameraTimeline } from '../director-camera-timeline';
import { TimelineBar } from '../timeline-bar';

function setupDirectorStores(workspaceMode: 'board' | 'director' = 'director') {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]!.id;
  const slideId = project.phases[0]!.slides[0]!.id;
  const docStore = createDocumentStore(project);
  docStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
  docStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
  const sessStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
    workspaceMode,
  });
  const playStore = createPlaybackStore();
  const renderWithProvider = (ui: ReactNode) =>
    render(
      <TacticalStoreProvider
        stores={{ documentStore: docStore, sessionStore: sessStore, playbackStore: playStore }}
      >
        {ui}
      </TacticalStoreProvider>,
    );
  return { docStore, sessStore, playStore, phaseId, renderWithProvider };
}

describe('DirectorCameraTimeline Component', () => {
  it('シークバー（director-scrubber-input）を value: 2000 に変更したとき、PlaybackStore.timeMs が 2000 に更新され、2.0s が表示されること', () => {
    const { playStore, renderWithProvider } = setupDirectorStores();
    renderWithProvider(<DirectorCameraTimeline />);

    const scrubberInput = screen.getByTestId('director-scrubber-input');
    fireEvent.change(scrubberInput, { target: { value: '2000' } });

    expect(playStore.getState().timeMs).toBe(2000);
    expect(screen.getByTestId('director-scrubber-time').textContent).toBe('2.0s');
  });
```

注記: `director-camera-timeline.test.tsx` 内の残余テストケースも `setupDirectorStores()` を使用し、`upsertGlobalCameraKeyframe` / `upsertActionCameraCue` 呼び出しを `docStore.getState().dispatch({ type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME' | 'UPSERT_ACTION_CAMERA_CUE', phaseId, ... })` に、`setWorkspaceMode` を `sessStore.getState().setWorkspaceMode` に、`playbackSeekTimeMs` 検証を `playStore.getState().timeMs` 検証に置換すること。

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/timeline/add-slide-button.tsx src/features/tactical-unified/panels/timeline/playback-controls.tsx src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx
  ```
