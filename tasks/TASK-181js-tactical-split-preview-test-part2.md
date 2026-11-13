# TASK-181js: Split Preview テスト後半（Boundary/Director Camera）移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): migrate remaining TacticalSplitPreviewPanel boundary and director camera tests to TacticalStoreProvider`

---

## 🎯 目的・背景

`TASK-181jr` で導入した `createSplitPreviewHarness` を用い、`tactical-split-preview-panel.test.tsx` 後半（L349-L727: Boundary Overlay・アスペクト比連動・Director Camera Keyframe/Cue）から `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` 依存を完全除去する。

## 🚨 残存禁止条件 (Negative Contracts)

- `tactical-split-preview-panel.test.tsx` 全体に `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` / `tactical-unified-store` が 1 箇所も残ってはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Boundary & Director Camera テスト移行（1テストファイル）

---

### Phase 1: Boundary & Director Camera テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`

#### Task 1.1 `[MODIFY]` `tactical-split-preview-panel.test.tsx`（後半 L349-L727）

**Before:**
```tsx
  it('renders boundary mask overlay and boundary box overlay handles when boundaryBox is enabled in edit mode', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('renders boundary mask overlay and boundary box overlay handles when boundaryBox is enabled in edit mode', () => {
    const { queryByTestId } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true, visible: true },
    }).renderPanel();
```

**Before:**
```tsx
  it('does not render toggle crop preview button even when boundaryBox is active', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('does not render toggle crop preview button even when boundaryBox is active', () => {
    const { queryByTestId } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true, visible: true },
    }).renderPanel();
```

**Before:**
```tsx
  it('hides edit handles and boundary overlay during playback for cropped preview', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { queryByTestId } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });
```
**After:**
```tsx
  it('hides edit handles and boundary overlay during playback for cropped preview', () => {
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true, visible: true },
    });
    const { queryByTestId } = renderPanel();

    expect(queryByTestId('boundary-box-overlay')).not.toBeNull();
    expect(queryByTestId('boundary-mask-overlay')).not.toBeNull();

    act(() => {
      playbackStore.getState().togglePlayback();
    });
```

**Before:**
```tsx
  it('updates active slide boundaryBox on 4-edge bar drag', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
  it('updates active phase boundaryBox on 4-edge bar drag', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 50, height: 50, enabled: true, visible: true },
    });
    const { getByTestId, container } = renderPanel();
```

**Before:**
```tsx
    const updated =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0]
        .boundaryBox;
    expect(updated?.x).toBe(20);
    expect(updated?.y).toBe(15);
    expect(updated?.width).toBe(50);
    expect(updated?.height).toBe(50);
  });

  it('allows pitch camera operation even when boundaryBox is active because boundary-box-frame is pointer-events-none', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 80,
        enabled: true,
      },
    });

    const { container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    const updated = documentStore.getState().project.phases[0].boundaryBox;
    expect(updated.x).toBe(20);
    expect(updated.y).toBe(15);
    expect(updated.width).toBe(50);
    expect(updated.height).toBe(50);
  });

  it('allows pitch camera operation even when boundaryBox is active because boundary-box-frame is pointer-events-none', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 80, enabled: true, visible: true },
    });
    const { container } = renderPanel();
```

**Before:**
```tsx
    const updatedSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    expect(updatedSlide.pitchTransform?.tilt).toBe(10);
    expect(updatedSlide.pitchTransform?.yaw).toBe(110);
  });

  it('updates active slide boundaryBox width and height on corner handle drag', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    const updatedSlide = documentStore.getState().project.phases[0].slides[0];
    expect(updatedSlide.pitchTransform?.tilt).toBe(10);
    expect(updatedSlide.pitchTransform?.yaw).toBe(110);
  });

  it('updates active phase boundaryBox width and height on corner handle drag', () => {
    const { documentStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 50, height: 50, enabled: true, visible: true },
    });
    const { getByTestId, container } = renderPanel();
```

**Before:**
```tsx
    const updated =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0]
        .boundaryBox;
    expect(updated?.x).toBe(10);
    expect(updated?.y).toBe(10);
    expect(updated?.width).toBe(60);
    expect(updated?.height).toBe(65);
  });

  it('locks container aspect ratio to 16:9 when stopped and updates to boundaryBox aspect ratio during playback', () => {
    const activeSlide =
      useTacticalUnifiedStore.getState().project.phases[0].slides[0];
    useTacticalUnifiedStore.getState().updateSlide(activeSlide.id, {
      boundaryBox: {
        x: 10,
        y: 10,
        width: 80,
        height: 50,
        enabled: true,
      },
    });

    const { getByTestId, container } = render(
      <TacticalUnifiedStoreProvider>
        <TacticalSplitPreviewPanel />
      </TacticalUnifiedStoreProvider>,
    );

    const canvas = container.querySelector('canvas');
    const previewContainer = getByTestId('preview-container');
    if (!canvas) throw new Error('Canvas not found');

    // 静止時: 16:9 full HD (1920x1080)
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(previewContainer.style.aspectRatio).toBe('1920 / 1080');

    act(() => {
      useTacticalUnifiedStore.getState().togglePlayback();
    });
```
**After:**
```tsx
    const updated = documentStore.getState().project.phases[0].boundaryBox;
    expect(updated.x).toBe(10);
    expect(updated.y).toBe(10);
    expect(updated.width).toBe(60);
    expect(updated.height).toBe(65);
  });

  it('locks container aspect ratio to 16:9 when stopped and updates to boundaryBox aspect ratio during playback', () => {
    const { playbackStore, renderPanel } = createSplitPreviewHarness({
      boundaryBox: { x: 10, y: 10, width: 80, height: 50, enabled: true },
    });
    const { getByTestId, container } = renderPanel();

    const canvas = container.querySelector('canvas');
    const previewContainer = getByTestId('preview-container');
    if (!canvas) throw new Error('Canvas not found');

    // 静止時: 16:9 full HD (1920x1080)
    expect(canvas.width).toBe(1920);
    expect(canvas.height).toBe(1080);
    expect(previewContainer.style.aspectRatio).toBe('1920 / 1080');

    act(() => {
      playbackStore.getState().togglePlayback();
    });
```

**Before:**
```tsx
  describe('Director Camera Track Interaction', () => {
    it('upserts global camera keyframe on normal left-drag pointer up', () => {
      const { container } = render(
        <TacticalUnifiedStoreProvider>
          <TacticalSplitPreviewPanel />
        </TacticalUnifiedStoreProvider>,
      );

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
      fireEvent.pointerUp(canvas);

      const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
```
**After:**
```tsx
  describe('Director Camera Track Interaction', () => {
    it('upserts global camera keyframe on normal left-drag pointer up', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, button: 0 });
      fireEvent.pointerMove(canvas, { clientX: 150, clientY: 60, button: 0 });
      fireEvent.pointerUp(canvas);

      const activePhase = documentStore.getState().project.phases[0];
```

**Before:**
```tsx
    it('upserts action camera cue on Shift + pointer drag (pan mode)', () => {
      const { container } = render(
        <TacticalUnifiedStoreProvider>
          <TacticalSplitPreviewPanel />
        </TacticalUnifiedStoreProvider>,
      );
```
**After:**
```tsx
    it('upserts action camera cue on Shift + pointer drag (pan mode)', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();
```

**Before:**
```tsx
      fireEvent.pointerUp(canvas);

      const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```
**After:**
```tsx
      fireEvent.pointerUp(canvas);

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```

**Before:**
```tsx
    it('upserts action camera cue on canvas wheel event with updated zoom', () => {
      const { container } = render(
        <TacticalUnifiedStoreProvider>
          <TacticalSplitPreviewPanel />
        </TacticalUnifiedStoreProvider>,
      );

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.wheel(canvas, { deltaY: -100 });

      const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```
**After:**
```tsx
    it('upserts action camera cue on canvas wheel event with updated zoom', () => {
      const { documentStore, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      const canvas = container.querySelector('canvas');
      if (!canvas) throw new Error('Canvas not found');

      fireEvent.wheel(canvas, { deltaY: -100 });

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```

**Before:**
```tsx
    it('updates existing active cue on native container wheel event with preventDefault and activeCue.id', () => {
      const { container } = render(
        <TacticalUnifiedStoreProvider>
          <TacticalSplitPreviewPanel />
        </TacticalUnifiedStoreProvider>,
      );

      const store = useTacticalUnifiedStore.getState();
      act(() => {
        store.upsertActionCameraCue(
          0,
          {
            zoom: 1.8,
            durationMs: 2000,
          },
          'cue-test-1',
        );
      });
```
**After:**
```tsx
    it('updates existing active cue on native container wheel event with preventDefault and activeCue.id', () => {
      const { documentStore, phaseId, renderPanel } = createSplitPreviewHarness();
      const { container } = renderPanel();

      act(() => {
        documentStore.getState().dispatch({
          type: 'UPSERT_ACTION_CAMERA_CUE',
          phaseId,
          startTimeMs: 0,
          patch: { zoom: 1.8, durationMs: 2000 },
          cueId: 'cue-test-1',
        });
      });
```

**Before:**
```tsx
      expect(preventSpy).toHaveBeenCalled();

      const activePhase = useTacticalUnifiedStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```
**After:**
```tsx
      expect(preventSpy).toHaveBeenCalled();

      const activePhase = documentStore.getState().project.phases[0];
      const actionCues = activePhase.directorCamera?.actionCues;
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx
  ```
