# TASK-181jr: Split Preview テスト前半（ハーネス導入・Camera/Drag）移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): introduce 3-store harness and migrate first half of TacticalSplitPreviewPanel tests`

---

## 🎯 目的・背景

`TASK-181jp` 完了に伴い、`tactical-split-preview-panel.test.tsx` に `createSplitPreviewHarness()` を導入し、前半（L1-L348: レイアウト・背景・カメラドラッグ・ホイール・MVP・写真キャッシュ）を `TacticalStoreProvider` ベースへ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- 前半 L1-L348 内に `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` の新規参照を残してはならない（`TASK-181js` で後半を完全除去する前提）。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `createSplitPreviewHarness` 導入 & 前半テスト移行（1テストファイル）

---

### Phase 1: `createSplitPreviewHarness` 導入 & 前半テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`

#### Task 1.1 `[MODIFY]` `tactical-split-preview-panel.test.tsx`（ハーネス導入 & 前半 L1-L348）

**Before:**
```tsx
import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotoRegistryHook from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import { TacticalSplitPreviewPanel } from '../tactical-split-preview-panel';

describe('TacticalSplitPreviewPanel (Layout Mode)', () => {
```
**After:**
```tsx
import { act, fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as playerPhotoRegistryHook from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import * as sharePayload from '@/lib/tactical/export/share-payload';
import * as frameRenderer from '@/lib/tactical/export/tactical-frame-renderer';
import type { PitchTransform } from '@/lib/types/tactical/slide';
import { TacticalSplitPreviewPanel } from '../tactical-split-preview-panel';

export function createSplitPreviewHarness(options?: {
  aspectRatio?: '16:9' | '4:5' | '1:1' | '9:16';
  boundaryBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
    enabled: boolean;
    visible?: boolean;
    fitTarget?: 'pitch' | 'canvas';
  };
  screenBackground?: { type: 'cinematic' | 'transparent' | 'solid'; color?: string };
  pitchTransform?: PitchTransform;
}) {
  const bundle = normalizeTacticalProject({
    id: 'proj-split-test',
    title: 'Split Test',
    ...(options?.screenBackground ? { screenBackground: options.screenBackground } : {}),
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        aspectRatio: options?.aspectRatio ?? '16:9',
        ...(options?.boundaryBox ? { boundaryBox: options.boundaryBox } : {}),
        slides: [
          {
            id: 'slide-1',
            index: 0,
            ...(options?.pitchTransform ? { pitchTransform: options.pitchTransform } : {}),
          },
        ],
      },
    ],
  });
  const documentStore = createDocumentStore(bundle.project);
  const sessionStore = createSessionStore({
    activePhaseId: bundle.activePhaseId,
    activeSlideId: bundle.activeSlideId,
  });
  const playbackStore = createPlaybackStore();
  const renderPanel = () =>
    render(
      <TacticalStoreProvider stores={{ documentStore, sessionStore, playbackStore }}>
        <TacticalSplitPreviewPanel />
      </TacticalStoreProvider>,
    );
  return {
    documentStore,
    sessionStore,
    playbackStore,
    phaseId: bundle.activePhaseId,
    slideId: bundle.activeSlideId,
    renderPanel,
  };
}

describe('TacticalSplitPreviewPanel (Layout Mode)', () => {
```

**Before:**
```tsx
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().stopPlayback();
  });

  it('renders full-bleed layout canvas with border-white/10 without header or footer controls', () => {
    const { container, queryByText, queryByLabelText } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
  });

  it('renders full-bleed layout canvas with border-white/10 without header or footer controls', () => {
    const { container, queryByText, queryByLabelText } = createSplitPreviewHarness().renderPanel();
```

**Before:**
```tsx
  it('renders canvas with 16:9 Full HD (1920x1080) even when project aspectRatio is 4:5', () => {
    useTacticalUnifiedStore.getState().setAspectRatio('4:5');
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      aspectRatio: '4:5',
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('renders canvas with 16:9 Full HD (1920x1080) even when project aspectRatio is 4:5', () => {
    const { container } = createSplitPreviewHarness({ aspectRatio: '4:5' }).renderPanel();
```

**Before:**
```tsx
  it('passes screenBackground from store to renderTacticalFrameToCanvas', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    useTacticalUnifiedStore.getState().updateScreenBackground({
      type: 'cinematic',
    });

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('passes screenBackground from store to renderTacticalFrameToCanvas', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    createSplitPreviewHarness({ screenBackground: { type: 'cinematic' } }).renderPanel();
```

**Before:**
```tsx
  it('passes boundaryBox as null during stopped, and active boundaryBox during playback to useExportPreviewAnimation', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    const testBox = {
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      enabled: true,
    };
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: testBox,
    });

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    // 停止時は境界線オーバーレイで編集するため、レンダラーには boundaryBox: null (16:9 全体) を渡す
    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        boundaryBox: null,
      }),
    );

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });
```
**After:**
```tsx
  it('passes boundaryBox as null during stopped, and active boundaryBox during playback to useExportPreviewAnimation', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true },
    });
    renderPanel();

    // 停止時は境界線オーバーレイで編集するため、レンダラーには boundaryBox: null (16:9 全体) を渡す
    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ boundaryBox: null }),
    );

    act(() => {
      playbackStore.getState().togglePlayback();
    });
```

**Before:**
```tsx
  it('updates tilt and yaw on normal left-drag only on pointer up (drag end)', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });

    // ドラッグ途中ではストアの pitchTransform はまだ更新されない
    const midSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(midSlide.pitchTransform?.tilt ?? 0).toBe(0);
    expect(midSlide.pitchTransform?.yaw ?? 90).toBe(90);

    // pointerUp で初めてストアへコミットされる
    fireEvent.pointerUp(canvas);

    const endSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(endSlide.pitchTransform?.tilt).toBe(10);
```
**After:**
```tsx
  it('updates tilt and yaw on normal left-drag only on pointer up (drag end)', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();

    const canvas = container.querySelector('canvas');
    if (!canvas) throw new Error('Canvas not found');

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });

    // ドラッグ途中ではストアの pitchTransform はまだ更新されない
    const midSlide = documentStore.getState().project.phases[0].slides[0];
    expect(midSlide.pitchTransform?.tilt ?? 0).toBe(0);
    expect(midSlide.pitchTransform?.yaw ?? 90).toBe(90);

    // pointerUp で初めてストアへコミットされる
    fireEvent.pointerUp(canvas);

    const endSlide = documentStore.getState().project.phases[0].slides[0];
    expect(endSlide.pitchTransform?.tilt).toBe(10);
```

**Before:**
```tsx
  it('clamps tilt between 0 and 70, and normalizes yaw between 0 and 360', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('clamps tilt between 0 and 70, and normalizes yaw between 0 and 360', () => {
    const { documentStore, phaseId, slideId, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();
```

**Before:**
```tsx
    let activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(0);

    // Drag up huge amount (-dy) to try exceeding 70
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: -300, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(70);

    // Test yaw wrap-around
    useTacticalUnifiedStore
      .getState()
      .updatePitchTransform(activeSlide.id, { yaw: 90 });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: -200, clientY: 100, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
```
**After:**
```tsx
    let activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(0);

    // Drag up huge amount (-dy) to try exceeding 70
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: -300, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.tilt).toBe(70);

    // Test yaw wrap-around
    documentStore.getState().dispatchSlide(phaseId, slideId, {
      type: 'UPDATE_SLIDE_META',
      patch: { pitchTransform: { tilt: 70, yaw: 90, zoom: 1, panX: 0, panY: 0 } },
    });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: -200, clientY: 100, button: 0 });
    fireEvent.pointerUp(canvas);

    activeSlide = documentStore.getState().project.phases[0].slides[0];
```

**Before:**
```tsx
  it('updates panX and panY on Shift + pointer drag (pan mode)', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('updates panX and panY on Shift + pointer drag (pan mode)', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();
```

**Before:**
```tsx
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.panX).toBe(50);
```
**After:**
```tsx
    const activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.panX).toBe(50);
```

**Before:**
```tsx
  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds', () => {
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('updates zoom on canvas wheel event within 0.5 to 2.5 bounds', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness();
    const { container } = renderPanel();
```

**Before:**
```tsx
    fireEvent.wheel(canvas, { deltaY: -200 });

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1.3);
  });

  it('passes mvpMatrix as null when camera is at default front angle', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mvpMatrix: null,
      }),
    );

    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    act(() => {
      useTacticalUnifiedStore.getState().updatePitchTransform(activeSlide.id, {
        tilt: 15,
        yaw: 75,
      });
    });
```
**After:**
```tsx
    fireEvent.wheel(canvas, { deltaY: -200 });

    const activeSlide = documentStore.getState().project.phases[0].slides[0];
    expect(activeSlide.pitchTransform?.zoom).toBe(1.3);
  });

  it('passes mvpMatrix as null when camera is at default front angle', () => {
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    const { documentStore, phaseId, slideId, renderPanel } = createSplitPreviewHarness();

    renderPanel();

    expect(renderSpy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mvpMatrix: null }),
    );

    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'UPDATE_SLIDE_META',
        patch: { pitchTransform: { tilt: 15, yaw: 75, zoom: 1, panX: 0, panY: 0 } },
      });
    });
```

**Before:**
```tsx
    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
```
**After:**
```tsx
    const { container } = createSplitPreviewHarness().renderPanel();

    const canvas = container.querySelector('canvas');
```

**Before:**
```tsx
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');

    render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    const renderSpy = vi.spyOn(frameRenderer, 'renderTacticalFrameToCanvas');
    createSplitPreviewHarness().renderPanel();
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx
  ```
