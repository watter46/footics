# TASK-181jn: Export & Share Hooks / UI の 3ストア・Domain 型移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `refactor(tactical): migrate export preview, share hooks, and export modal to 3-store architecture`

---

## 🎯 目的・背景

Export Preview・Export Modal・Share Page 用フック／UI コンポーネントから旧 `tactical-unified-store` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` 依存を完全に排除し、`DocumentStore` / `SessionStore` / `PlaybackStore` および `@/lib/types/tactical/*` へ移行する。

`ExportPreviewPlayer` は `<TacticalStoreProvider>` 内外の両方（`ExportModalBody`・`TacticalSplitPreviewPanel`・`SharePageClientView`・プロバイダなし単体テスト）で利用されるため、`useExportPreviewAnimation` は `useContext(TacticalStoresContext)` による任意参照（未提供時はフォールバックストア）を使用する。

## 🚨 残存禁止条件 (Negative Contracts)

- `useTacticalUnifiedStore` / `useTacticalUnifiedStoreContext` / `useTacticalUnifiedStoreApi` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` を上記ファイル内に残してはならない。
- `useExportPreviewAnimation` は `<TacticalStoreProvider>` 外で呼び出された際に例外を投げてはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Export Preview 定数・テクスチャ・アニメーションフック移行（3プロダクションファイル）
- **Phase 2**: Export Preview Player・Share フック・Export Modal State/Body 移行（4プロダクションファイル）
- **Phase 3**: Share Page Export フック & Share Payload 型インポート純化（2プロダクションファイル）

---

### Phase 1: Export Preview 定数・テクスチャ・アニメーションフック移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/export/export-preview-constants.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-textures.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-constants.ts`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
  aspectRatio: AspectRatio;
```
**After:**
```ts
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { DirectorCameraTrack } from '@/lib/types/tactical/project';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';

export interface UseExportPreviewAnimationParams {
  slides: readonly (Slide | DomainSlide)[];
  aspectRatio: AspectRatio;
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-textures.ts`

**Before:**
```ts
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import type {
  PitchAppearanceConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import { getCachedMarbleImage, loadMarbleTexture } from './load-marble-texture';

export interface UseExportPreviewTexturesParams {
  slides: Slide[];
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}
```
**After:**
```ts
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { PitchAppearanceConfig, Slide } from '@/lib/types/tactical/slide';
import { getCachedMarbleImage, loadMarbleTexture } from './load-marble-texture';

export interface UseExportPreviewTexturesParams {
  slides: readonly (Slide | DomainSlide)[];
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`

**Before:**
```ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useStore } from 'zustand';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { hasActiveFrameEffects } from '@/lib/tactical/export/tactical-frame-effects';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { calculateBoundaryCrop } from '@/lib/tactical/export/video-crop-calc';
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';

const fallbackSessionStore = createSessionStore();
const fallbackPlaybackStore = createPlaybackStore();
```

**Before:**
```ts
  const seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo);
  const workspaceMode =
    useTacticalUnifiedStoreContext((s) => s.workspaceMode) ?? 'normal';
  const storeTeamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const effectiveTeamVisibility =
    teamVisibility ?? storeTeamVisibility ?? 'both';
  const lastSeekNoticeTimeRef = useRef<number>(-9999);
  const isInternalSeekRef = useRef<boolean>(false);
  const stateRef = useRef({ workspaceMode, effectiveIsPlaying, seekTo });
  stateRef.current = { workspaceMode, effectiveIsPlaying, seekTo };
```
**After:**
```ts
  const stores = useContext(TacticalStoresContext);
  const sessionStore = stores?.sessionStore ?? fallbackSessionStore;
  const playbackStore = stores?.playbackStore ?? fallbackPlaybackStore;

  const seekTo = useStore(playbackStore, (s) =>
    stores ? s.seekTo : undefined,
  );
  const workspaceMode = useStore(sessionStore, (s) => s.workspaceMode);
  const storeTeamVisibility = useStore(sessionStore, (s) => s.teamVisibility);
  const playbackTimeMs = useStore(playbackStore, (s) => Number(s.timeMs));
  const effectiveTeamVisibility =
    teamVisibility ?? storeTeamVisibility ?? 'both';
  const lastSeekNoticeTimeRef = useRef<number>(-9999);
  const lastDispatchedSeekMsRef = useRef<number | null>(null);
  const lastStoreTimeMsRef = useRef<number>(playbackTimeMs);
  const stateRef = useRef({ workspaceMode, effectiveIsPlaying, seekTo });
  stateRef.current = { workspaceMode, effectiveIsPlaying, seekTo };
```

**Before:**
```ts
      if (
        stateRef.current.effectiveIsPlaying &&
        stateRef.current.workspaceMode === 'director'
      ) {
        if (Math.abs(timeMs - lastSeekNoticeTimeRef.current) >= 60) {
          lastSeekNoticeTimeRef.current = timeMs;
          isInternalSeekRef.current = true;
          stateRef.current.seekTo?.(timeMs);
        }
      }
```
**After:**
```ts
      if (
        stateRef.current.effectiveIsPlaying &&
        stateRef.current.workspaceMode === 'director'
      ) {
        if (Math.abs(timeMs - lastSeekNoticeTimeRef.current) >= 60) {
          lastSeekNoticeTimeRef.current = timeMs;
          lastDispatchedSeekMsRef.current = Math.max(0, timeMs);
          stateRef.current.seekTo?.(timeMs);
        }
      }
```

**Before:**
```ts
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const playbackSeekId = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekId,
  );
  const lastHandledSeekIdRef = useRef(0);

  useEffect(() => {
    if (playbackSeekId > 0 && playbackSeekId !== lastHandledSeekIdRef.current) {
      lastHandledSeekIdRef.current = playbackSeekId;
      if (isInternalSeekRef.current) {
        isInternalSeekRef.current = false;
        return;
      }
      if (playbackSeekTimeMs !== null) seek(playbackSeekTimeMs);
    }
  }, [playbackSeekId, playbackSeekTimeMs, seek]);

  const prevPlayingRef = useRef(effectiveIsPlaying);
  useEffect(() => {
    if (
      prevPlayingRef.current &&
      !effectiveIsPlaying &&
      stateRef.current.workspaceMode === 'director'
    ) {
      isInternalSeekRef.current = true;
      stateRef.current.seekTo?.(currentTimeMsRef.current);
    }
    prevPlayingRef.current = effectiveIsPlaying;
  }, [effectiveIsPlaying]);
```
**After:**
```ts
  useEffect(() => {
    if (!stores) return;
    if (playbackTimeMs === lastStoreTimeMsRef.current) return;
    lastStoreTimeMsRef.current = playbackTimeMs;
    if (
      lastDispatchedSeekMsRef.current !== null &&
      Math.abs(playbackTimeMs - lastDispatchedSeekMsRef.current) < 1e-6
    ) {
      lastDispatchedSeekMsRef.current = null;
      return;
    }
    seek(playbackTimeMs);
  }, [stores, playbackTimeMs, seek]);

  const prevPlayingRef = useRef(effectiveIsPlaying);
  useEffect(() => {
    if (
      prevPlayingRef.current &&
      !effectiveIsPlaying &&
      stateRef.current.workspaceMode === 'director'
    ) {
      lastDispatchedSeekMsRef.current = Math.max(0, currentTimeMsRef.current);
      stateRef.current.seekTo?.(currentTimeMsRef.current);
    }
    prevPlayingRef.current = effectiveIsPlaying;
  }, [effectiveIsPlaying]);
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/export/export-preview-constants.ts src/features/tactical-unified/panels/export/use-export-preview-textures.ts src/features/tactical-unified/panels/export/use-export-preview-animation.ts
  ```

---

### Phase 2: Export Preview Player・Share フック・Export Modal State/Body 移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx`
  - `src/features/tactical-unified/panels/export/use-export-share.ts`
  - `src/features/tactical-unified/panels/export/use-export-modal-state.ts`
  - `src/features/tactical-unified/panels/export/export-modal-body.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-player.tsx`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { DirectorCameraTrack } from '@/lib/types/tactical/project';
import type {
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
```

**Before:**
```ts
export interface ExportPreviewPlayerProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
```
**After:**
```ts
export interface ExportPreviewPlayerProps {
  slides: readonly (Slide | DomainSlide)[];
  aspectRatio: AspectRatio;
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-share.ts`

**Before:**
```ts
import {
  selectActivePhaseSlides,
  selectTacticalRenderSnapshot,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { packPlayerPhotos } from '@/lib/tactical/export/share-payload';
```
**After:**
```ts
import {
  selectDomainActivePhaseSlides,
  selectDomainRenderSnapshot,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { packPlayerPhotos } from '@/lib/tactical/export/share-payload';
```

**Before:**
```ts
export function useExportShare({ onError }: ShareOptions) {
  const storeApi = useTacticalUnifiedStoreApi();
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createShareLink = async () => {
    if (slides.length <= 1) {
      onError('iPhone Export requires 2 or more scenes.');
      return;
    }
    setIsCreatingShareLink(true);
    setShareUrl(null);

    try {
      const state = storeApi.getState();
      const { project } = state;
      const snapshot = selectTacticalRenderSnapshot(state);
      const currentSlides = selectActivePhaseSlides(state);
      const photos = await packPlayerPhotos(currentSlides);
```
**After:**
```ts
export function useExportShare({ onError }: ShareOptions) {
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const createShareLink = async () => {
    if (slides.length <= 1) {
      onError('iPhone Export requires 2 or more scenes.');
      return;
    }
    setIsCreatingShareLink(true);
    setShareUrl(null);

    try {
      const currentProject = documentStore.getState().project;
      const {
        activePhaseId: currentPhaseId,
        activeSlideId: currentSlideId,
        teamVisibility,
      } = sessionStore.getState();
      const snapshot = selectDomainRenderSnapshot(
        currentProject,
        currentPhaseId,
        currentSlideId,
        teamVisibility,
      );
      const currentSlides = selectDomainActivePhaseSlides(
        currentProject,
        currentPhaseId,
      );
      const photos = await packPlayerPhotos(currentSlides);
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-modal-state.ts`

**Before:**
```ts
import {
  selectActiveBoundaryBox,
  selectActivePhase,
  selectActivePhaseAspectRatio,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```ts
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
```

**Before:**
```ts
export function useExportModalState() {
  const closeExportModal = useTacticalUnifiedStoreContext(
    (s) => s.closeExportModal,
  );
  const isExporting = useTacticalUnifiedStoreContext((s) => s.isExporting);
  const setIsExporting = useTacticalUnifiedStoreContext(
    (s) => s.setIsExporting,
  );
  const pendingExport = useTacticalUnifiedStoreContext((s) => s.pendingExport);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
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
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
```
**After:**
```ts
export function useExportModalState() {
  const closeExportModal = useSessionStore((s) => s.closeExportModal);
  const isExporting = useSessionStore((s) => s.isExporting);
  const setIsExporting = useSessionStore((s) => s.setIsExporting);
  const pendingExport = useSessionStore((s) => s.pendingExport);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const project = useDocumentStore((s) => s.project);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const aspectRatio = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
  const boundaryBox = selectDomainActiveBoundaryBox(project, activePhaseId);
  const pitchAppearance = project.pitchAppearance;
  const screenBackground = project.screenBackground;
```

#### Task 2.4 `[MODIFY]` `src/features/tactical-unified/panels/export/export-modal-body.tsx`

**Before:**
```ts
import { selectActivePhase } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  exportTacticalProjectToJson,
  importTacticalProjectFromJson,
} from '@/lib/db/tactical-projects-db';
```
**After:**
```ts
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  exportTacticalProjectToJson,
  importTacticalProjectFromJson,
} from '@/lib/db/tactical-projects-db';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
```

**Before:**
```ts
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
```
**After:**
```ts
  const project = useDocumentStore((s) => s.project);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const activePhase = selectDomainActivePhase(project, activePhaseId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
```

**Before:**
```ts
    try {
      const imported = await importTacticalProjectFromJson(file, false);
      loadProject(imported);
      toast.success(`Loaded project: "${imported.title}"`);
      closeExportModal();
```
**After:**
```ts
    try {
      const imported = await importTacticalProjectFromJson(file, false);
      const bundle = normalizeTacticalProject(imported);
      loadProject(bundle.project);
      setActivePhaseId(bundle.activePhaseId);
      setActiveSlideId(bundle.activeSlideId);
      toast.success(`Loaded project: "${bundle.project.title ?? 'Untitled'}"`);
      closeExportModal();
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/export/use-export-share.ts src/features/tactical-unified/panels/export/use-export-modal-state.ts src/features/tactical-unified/panels/export/export-modal-body.tsx
  ```

---

### Phase 3: Share Page Export フック & Share Payload 型インポート純化

- **担当ファイル**:
  - `src/features/tactical-unified/components/use-share-page-export.ts`
  - `src/lib/tactical/export/share-payload.ts`

#### Task 3.1 `[MODIFY]` `src/features/tactical-unified/components/use-share-page-export.ts`

**Before:**
```ts
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';
import type { AspectRatio, Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import { exportMultiSlideMp4Video } from '@/lib/tactical/export/tactical-video-exporter';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import type { Slide } from '@/lib/types/tactical/slide';
```

#### Task 3.2 `[MODIFY]` `src/lib/tactical/export/share-payload.ts`

**Before:**
```ts
import {
  type AspectRatio,
  type BoundaryBox,
  BoundaryBoxSchema,
  type DirectorCameraTrack,
  DirectorCameraTrackSchema,
  type PitchAppearanceConfig,
  PitchAppearanceConfigSchema,
  type PitchTransform,
  PitchTransformSchema,
  type ScreenBackgroundConfig,
  ScreenBackgroundConfigSchema,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import {
  type DirectorCameraTrack,
  DirectorCameraTrackSchema,
} from '@/lib/types/tactical/project';
import {
  type BoundaryBox,
  BoundaryBoxSchema,
  type PitchAppearanceConfig,
  PitchAppearanceConfigSchema,
  type PitchTransform,
  PitchTransformSchema,
  type ScreenBackgroundConfig,
  ScreenBackgroundConfigSchema,
} from '@/lib/types/tactical/slide';
```

- **検証 (Phase 3)**:
  ```bash
  bun run ai:check src/features/tactical-unified/components/use-share-page-export.ts src/lib/tactical/export/share-payload.ts
  ```
