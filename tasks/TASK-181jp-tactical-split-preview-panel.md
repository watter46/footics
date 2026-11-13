# TASK-181jp: Split Preview パネルの 3ストア・Domain コマンド移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `refactor(tactical): migrate TacticalSplitPreviewPanel and zoom/photo helpers to 3-store commands`

---

## 🎯 目的・背景

`TacticalSplitPreviewPanel` および関連ヘルパー（`preview-player-photos.ts`, `use-preview-wheel-zoom.ts`）を旧 `tactical-unified-store` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` から 3 ストア（`DocumentStore` / `SessionStore` / `PlaybackStore`）と Domain V3 コマンドへ移行する。

Domain V3 では `boundaryBox` は Phase 単位（`DomainTacticalPhase.boundaryBox`）であるため、境界線編集コミットは `UPDATE_PHASE` コマンドとしてディスパッチする。

## 🚨 残存禁止条件 (Negative Contracts)

- `useTacticalUnifiedStoreContext` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` を対象ファイル内に残してはならない。
- 旧 `updateSlide` 等の互換アダプターを残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Split Preview 関連ファイル移行（3プロダクションファイル）

---

### Phase 1: Split Preview 関連ファイル移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/split-preview/preview-player-photos.ts`
  - `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/split-preview/preview-player-photos.ts`

**Before:**
```ts
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import type { Player } from '@/lib/types/tactical-unified';

export function buildPlayerPhotoRecord(
  players: Player[],
  photoMap: ReadonlyMap<string, HTMLImageElement | CanvasImageSource>,
): Record<string, CanvasImageSource> {
```
**After:**
```ts
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

export function buildPlayerPhotoRecord(
  players: readonly Pick<DomainPlayer, 'id' | 'playerId'>[],
  photoMap: ReadonlyMap<string, HTMLImageElement | CanvasImageSource>,
): Record<string, CanvasImageSource> {
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts`

**Before:**
```ts
import { type RefObject, useEffect } from 'react';
import type {
  ActionCameraCue,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';

interface UsePreviewWheelZoomParams {
  containerRef: RefObject<HTMLDivElement | null>;
  activeCue?: ActionCameraCue;
  resolvedCamera: PitchTransform | null;
  activeSlide?: Slide | null;
```
**After:**
```ts
import { type RefObject, useEffect } from 'react';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { ActionCameraCue } from '@/lib/types/tactical/project';
import type { PitchTransform, Slide } from '@/lib/types/tactical/slide';

interface UsePreviewWheelZoomParams {
  containerRef: RefObject<HTMLDivElement | null>;
  activeCue?: ActionCameraCue;
  resolvedCamera: PitchTransform | null;
  activeSlide?: Slide | DomainSlide | null;
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`

**Before:**
```tsx
import {
  selectActiveBoundaryBox,
  selectActivePhase,
  selectActivePhaseAspectRatio,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { isBoundaryCropActive } from '@/lib/tactical/export/video-crop-calc';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { PitchTransform } from '@/lib/types/tactical/slide';
```
**After:**
```tsx
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { isBoundaryCropActive } from '@/lib/tactical/export/video-crop-calc';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { ActionCameraCue, GlobalCameraKeyframe } from '@/lib/types/tactical/project';
import type { BoundaryBox, PitchTransform } from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function TacticalSplitPreviewPanel() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const aspectRatio = useTacticalUnifiedStoreContext(
    selectActivePhaseAspectRatio,
  );
  const boundaryBox = useTacticalUnifiedStoreContext(selectActiveBoundaryBox);
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground,
  );
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const updateActiveSlideBoundaryBox = useTacticalUnifiedStoreContext(
    (s) => s.updateActiveSlideBoundaryBox,
  );
  const upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.upsertGlobalCameraKeyframe,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );
```
**After:**
```tsx
export function TacticalSplitPreviewPanel() {
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const playbackTimeMs = usePlaybackStore((s) => Number(s.timeMs));
  const togglePlayback = usePlaybackStore((s) => s.togglePlayback);

  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
  const boundaryBox = selectDomainActiveBoundaryBox(project, activePhaseId);
  const pitchAppearance = project.pitchAppearance;
  const screenBackground = project.screenBackground;
  const targetPhaseId = activePhase?.id ?? activePhaseId;

  const updatePitchTransform = (
    slideId: string,
    transform: Partial<PitchTransform>,
  ) => {
    const base: PitchTransform = activeSlide?.pitchTransform ?? {
      tilt: 0,
      yaw: 90,
      zoom: 1,
      panX: 0,
      panY: 0,
      isLocked: false,
    };
    dispatchSlide(targetPhaseId, slideId, {
      type: 'UPDATE_SLIDE_META',
      patch: { pitchTransform: { ...base, ...transform } },
    });
  };

  const updatePhaseBoundaryBox = (box: BoundaryBox) => {
    dispatch({
      type: 'UPDATE_PHASE',
      phaseId: targetPhaseId,
      patch: { boundaryBox: box },
    });
  };

  const upsertGlobalCameraKeyframe = (
    timeMs: number,
    patch: Partial<Omit<GlobalCameraKeyframe, 'id'>>,
    keyframeId?: string,
  ) => {
    dispatch({
      type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME',
      phaseId: targetPhaseId,
      timeMs,
      patch,
      ...(keyframeId ? { keyframeId } : {}),
      activeSlideId: activeSlide?.id,
    });
  };

  const upsertActionCameraCue = (
    startTimeMs: number,
    patch: Partial<Omit<ActionCameraCue, 'id'>>,
    cueId?: string,
  ) => {
    dispatch({
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: targetPhaseId,
      startTimeMs,
      patch,
      ...(cueId ? { cueId } : {}),
    });
  };
```

**Before:**
```tsx
  const currentTimeMs = playbackSeekTimeMs ?? 0;
```
**After:**
```tsx
  const currentTimeMs = playbackTimeMs;
```

**Before:**
```tsx
          {Boolean(boundaryBox?.visible) && !isPlaying && boundaryBox && (
            <PreviewBoundaryOverlay
              boundaryBox={boundaryBox}
              containerRef={containerRef}
              onCommit={updateActiveSlideBoundaryBox}
            />
          )}
```
**After:**
```tsx
          {Boolean(boundaryBox?.visible) && !isPlaying && boundaryBox && (
            <PreviewBoundaryOverlay
              boundaryBox={boundaryBox}
              containerRef={containerRef}
              onCommit={updatePhaseBoundaryBox}
            />
          )}
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/split-preview/preview-player-photos.ts src/features/tactical-unified/panels/split-preview/use-preview-wheel-zoom.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx
  ```
