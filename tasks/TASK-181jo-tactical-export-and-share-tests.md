# TASK-181jo: Export Preview & Modal Body テストの 3ストア・Domain 型移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): migrate export helpers, preview animation, preview player, and modal body tests to TacticalStoreProvider`

---

## 🎯 目的・背景

`TASK-181jn` 完了に伴い、Export Helpers / Preview Animation / Preview Player / Modal Body の 4 テストファイルから `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` / `@/lib/types/tactical-unified` 依存を除去し、`TacticalStoreProvider` と `@/lib/types/tactical/*` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` / `@/lib/types/tactical-unified` を対象テスト内に残してはならない。
- 内部ストアやカスタムフックの `vi.mock` を追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Export Helpers・Preview Animation テスト移行（2テストファイル）
- **Phase 2**: Export Preview Player・Export Modal Body テスト移行（2テストファイル）

---

### Phase 1: Export Helpers・Preview Animation テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts`

**Before:**
```ts
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import * as videoEngine from '@/lib/tactical/export/video-export-engine';
import type { Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import * as videoEngine from '@/lib/tactical/export/video-export-engine';
import type { Slide } from '@/lib/types/tactical/slide';
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`

**Before:**
```tsx
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import * as frameRendererModule from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_1_1,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import * as frameRendererModule from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_1_1,
  DEFAULT_BOUNDARY_BOX_4_5,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  type PitchTransform,
  type Slide,
  SlideSchema,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
  beforeEach(() => {
    vi.clearAllMocks();
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.setState({
      playbackSeekTimeMs: null,
      playbackSeekId: 0,
      workspaceMode: 'board',
    });
    mockContext = {
```
**After:**
```tsx
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = {
```

**Before:**
```tsx
  it('notifies seekTo throttled during playback and on stop in director mode', () => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setWorkspaceMode('director');
    const seekSpy = vi.spyOn(useTacticalUnifiedStore.getState(), 'seekTo');

    let externalIsPlaying = true;
    const { rerender, result } = renderHook(() =>
      useExportPreviewAnimation({
        slides: [mockSlide1, mockSlide2],
        aspectRatio: '16:9',
        externalIsPlaying,
        canvasRef,
        timeLabelRef,
        sliderRef,
      }),
    );
```
**After:**
```tsx
  it('notifies seekTo throttled during playback and on stop in director mode', () => {
    const sessionStore = createSessionStore({ workspaceMode: 'director' });
    const playbackStore = createPlaybackStore();
    const seekSpy = vi.spyOn(playbackStore.getState(), 'seekTo');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider stores={{ sessionStore, playbackStore }}>
        {children}
      </TacticalStoreProvider>
    );

    let externalIsPlaying = true;
    const { rerender, result } = renderHook(
      () =>
        useExportPreviewAnimation({
          slides: [mockSlide1, mockSlide2],
          aspectRatio: '16:9',
          externalIsPlaying,
          canvasRef,
          timeLabelRef,
          sliderRef,
        }),
      { wrapper },
    );
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/hooks/__tests__/konva-export-helpers.test.ts src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts
  ```

---

### Phase 2: Export Preview Player・Export Modal Body テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx`
  - `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx`

**Before:**
```tsx
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import * as tacticalFrameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createXBoundaryBox,
  type ScreenBackgroundConfig,
  SlideSchema,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import * as tacticalFrameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createXBoundaryBox,
  type ScreenBackgroundConfig,
  SlideSchema,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
  it('toggles playback when Space key is pressed on window', async () => {
    render(
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('toggles playback when Space key is pressed on window', async () => {
    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
  it('does not toggle playback when typing Space in input or textarea elements', async () => {
    render(
      <TacticalUnifiedStoreProvider>
        <div>
          <input data-testid="test-input" type="text" />
          <textarea data-testid="test-textarea" />
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
          />
        </div>
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('does not toggle playback when typing Space in input or textarea elements', async () => {
    render(
      <TacticalStoreProvider>
        <div>
          <input data-testid="test-input" type="text" />
          <textarea data-testid="test-textarea" />
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
          />
        </div>
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
  it('cleans up keydown event listener when unmounted', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('cleans up keydown event listener when unmounted', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={null}
        />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
    render(
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={boundaryBox}
        />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="16:9"
          boundaryBox={boundaryBox}
        />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
    render(
      <TacticalUnifiedStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="4:5"
          boundaryBox={boundaryBox}
        />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    render(
      <TacticalStoreProvider>
        <ExportPreviewPlayer
          slides={[mockSlide]}
          aspectRatio="4:5"
          boundaryBox={boundaryBox}
        />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
    await act(async () => {
      render(
        <TacticalUnifiedStoreProvider>
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
            screenBackground={screenBackground}
          />
        </TacticalUnifiedStoreProvider>,
      );
    });
```
**After:**
```tsx
    await act(async () => {
      render(
        <TacticalStoreProvider>
          <ExportPreviewPlayer
            slides={[mockSlide]}
            aspectRatio="16:9"
            boundaryBox={null}
            screenBackground={screenBackground}
          />
        </TacticalStoreProvider>,
      );
    });
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx`

**Before:**
```tsx
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  DEFAULT_BOUNDARY_BOX_4_5,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  DEFAULT_BOUNDARY_BOX_4_5,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
  it('passes project.screenBackground to ExportPreviewPlayer', () => {
    const initialState = {
      project: {
        id: 'proj-1',
        title: 'Tactics Test',
        version: '2.0.0',
        aspectRatio: '4:5' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
        screenBackground: mockScreenBackground,
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            slides: [],
          },
        ],
      } as any,
    };

    render(
      <TacticalUnifiedStoreProvider initialState={initialState}>
        <ExportModalBody state={createMockState()} />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('passes project.screenBackground to ExportPreviewPlayer', () => {
    const bundle = normalizeTacticalProject({
      id: 'proj-1',
      title: 'Tactics Test',
      screenBackground: mockScreenBackground,
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '4:5',
          slides: [{ id: 'slide-1', index: 0 }],
        },
      ],
    });

    render(
      <TacticalStoreProvider
        initialProject={bundle.project}
        initialSession={{
          activePhaseId: bundle.activePhaseId,
          activeSlideId: bundle.activeSlideId,
        }}
      >
        <ExportModalBody state={createMockState()} />
      </TacticalStoreProvider>,
    );
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/export/__tests__/export-preview-player.test.tsx src/features/tactical-unified/panels/export/__tests__/export-modal-body.test.tsx
  ```
