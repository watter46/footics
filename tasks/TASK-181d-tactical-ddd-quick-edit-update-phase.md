# TASK-181d: クイック編集（Extension）の `UPDATE_PHASE` 一本化と空 `createCanvasStore` ハリボテ撤去

- **Status**: `DONE`
- **Commit**: `refactor(extension): unify quick annotation ratio dispatch with UPDATE_PHASE and remove empty store`

## 概要
`RatioPresetSelector.tsx` から `createCanvasStore({ mode: 'screenshot-edit' })` のハリボテ生成を完全撤去し、`TacticalStoresContext`（`documentStore` の `UPDATE_PHASE` ディスパッチおよび `boundaryBox` 購読）へ統合する。
`QuickAnnotationCanvas.tsx` の `applyRatio` でも `documentStore.dispatch({ type: 'UPDATE_PHASE' })` を実行し、`documentStore` の変更から `serializeProjectToScreenshotJson` 経由で `onAutoSave` が発火するよう配線する。
旧分割ドラフトファイル `tasks/TASK-180b-tactical-extension-store-unification.md` を物理削除（`[DELETE]`）する。

## Negative Contracts (残存禁止条件)
全タスク完了時点で以下の条件を満たすこと：
- `rg -l "createCanvasStore" extension/` が `0件` であること。
- 以下のファイルが物理削除されていること：
  - `tasks/TASK-180b-tactical-extension-store-unification.md`

---

## Phase 1: クイック編集（Extension）の `UPDATE_PHASE` 一本化と空 `createCanvasStore` ハリボテ撤去

### 対象ファイル
- `[MODIFY]` `extension/features/canvas/components/RatioPresetSelector.tsx`
- `[MODIFY]` `extension/features/canvas/components/QuickAnnotationCanvas.tsx`
- `[MODIFY]` `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx`
- `[MODIFY]` `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`
- `[DELETE]` `tasks/TASK-180b-tactical-extension-store-unification.md`

---

### 4-1. `[MODIFY]` `extension/features/canvas/components/RatioPresetSelector.tsx`

#### 4-1-1. import の更新
##### Before
```tsx
'use client';

import { Expand, LayoutTemplate } from 'lucide-react';
import type React from 'react';
import { useContext, useRef } from 'react';
import { useStore } from 'zustand';
import {
  CanvasStoreContext,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import type { CanvasStoreApi } from '@/features/tactical-unified/core/types';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
```

##### After
```tsx
'use client';

import { Expand, LayoutTemplate } from 'lucide-react';
import type React from 'react';
import { useCallback, useContext, useSyncExternalStore } from 'react';
import { CanvasStoreContext } from '@/features/tactical-unified/core';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';

const noopSubscribe = () => () => {};
```

#### 4-1-2. `RatioPresetSelector` のストア購読と `handleSelect` 実装
##### Before
```tsx
export function RatioPresetSelector({
  currentRatio,
  onSelectRatio,
  className = '',
}: RatioPresetSelectorProps): React.ReactElement {
  const store = useContext(CanvasStoreContext);
  const fallbackStoreRef = useRef<CanvasStoreApi | null>(null);
  if (!fallbackStoreRef.current) {
    fallbackStoreRef.current = createCanvasStore({ mode: 'screenshot-edit' });
  }
  const activeStore = store ?? fallbackStoreRef.current;
  const boundaryBox = useStore(activeStore, (s) => s.boundaryBox);

  // 比率の現在値判定
  const activeRatio = (() => {
    if (currentRatio !== undefined) return currentRatio;
    if (!boundaryBox?.enabled || boundaryBox.height === 0) return null;
    if (
      boundaryBox.width >= 99 &&
      boundaryBox.height >= 99 &&
      boundaryBox.x <= 1 &&
      boundaryBox.y <= 1
    ) {
      return 'full';
    }
    const stageAspect = 16 / 9;
    const currentAspect =
      (boundaryBox.width / boundaryBox.height) * stageAspect;

    for (const p of RATIO_PRESETS) {
      const target = ASPECT_RATIOS[p.ratio] ?? 1;
      if (Math.abs(currentAspect - target) < 0.05) {
        return p.ratio;
      }
    }
    return null;
  })();

  const handleSelect = (ratio: AspectRatio | 'full') => {
    if (onSelectRatio) {
      onSelectRatio(ratio);
      return;
    }
    if (!store) return;
    const setBoundaryBox = store.getState().setBoundaryBox;
    if (ratio === 'full') {
      setBoundaryBox({
        ...DEFAULT_BOUNDARY_BOX_FULL,
        enabled: true,
        visible: false,
      });
    } else {
      const newBox = createXBoundaryBox(ratio, '16:9');
      setBoundaryBox({
        ...newBox,
        enabled: true,
        visible: true,
      });
    }
  };
```

##### After
```tsx
export function RatioPresetSelector({
  currentRatio,
  onSelectRatio,
  className = '',
}: RatioPresetSelectorProps): React.ReactElement {
  const tacticalStores = useContext(TacticalStoresContext);
  const canvasStore = useContext(CanvasStoreContext);

  const subscribeBoundaryBox = useCallback(
    (onStoreChange: () => void) => {
      const unsubs: (() => void)[] = [];
      if (tacticalStores) {
        unsubs.push(tacticalStores.documentStore.subscribe(onStoreChange));
        unsubs.push(tacticalStores.sessionStore.subscribe(onStoreChange));
      }
      if (canvasStore) {
        unsubs.push(canvasStore.subscribe(onStoreChange));
      }
      if (unsubs.length === 0) return noopSubscribe();
      return () => {
        for (const u of unsubs) u();
      };
    },
    [tacticalStores, canvasStore],
  );

  const getBoundaryBoxSnapshot = useCallback((): BoundaryBox | null => {
    if (tacticalStores) {
      const doc = tacticalStores.documentStore.getState();
      const activePhaseId = tacticalStores.sessionStore.getState().activePhaseId;
      const phase =
        doc.project.phases.find((p) => p.id === activePhaseId) ??
        doc.project.phases[0];
      if (phase?.boundaryBox) {
        return phase.boundaryBox;
      }
    }
    if (canvasStore) {
      return canvasStore.getState().boundaryBox;
    }
    return null;
  }, [tacticalStores, canvasStore]);

  const boundaryBox = useSyncExternalStore(
    subscribeBoundaryBox,
    getBoundaryBoxSnapshot,
    getBoundaryBoxSnapshot,
  );

  // 比率の現在値判定
  const activeRatio = (() => {
    if (currentRatio !== undefined) return currentRatio;
    if (!boundaryBox?.enabled || boundaryBox.height === 0) return null;
    if (
      boundaryBox.width >= 99 &&
      boundaryBox.height >= 99 &&
      boundaryBox.x <= 1 &&
      boundaryBox.y <= 1
    ) {
      return 'full';
    }
    const stageAspect = 16 / 9;
    const currentAspect =
      (boundaryBox.width / boundaryBox.height) * stageAspect;

    for (const p of RATIO_PRESETS) {
      const target = ASPECT_RATIOS[p.ratio] ?? 1;
      if (Math.abs(currentAspect - target) < 0.05) {
        return p.ratio;
      }
    }
    return null;
  })();

  const handleSelect = (ratio: AspectRatio | 'full') => {
    if (onSelectRatio) {
      onSelectRatio(ratio);
      return;
    }
    const nextBox: BoundaryBox =
      ratio === 'full'
        ? {
            ...DEFAULT_BOUNDARY_BOX_FULL,
            enabled: true,
            visible: false,
          }
        : {
            ...createXBoundaryBox(ratio, '16:9'),
            enabled: true,
            visible: true,
          };

    if (tacticalStores) {
      const docState = tacticalStores.documentStore.getState();
      const activePhaseId =
        tacticalStores.sessionStore.getState().activePhaseId ||
        docState.project.phases[0]?.id;
      if (activePhaseId) {
        docState.dispatch({
          type: 'UPDATE_PHASE',
          phaseId: activePhaseId,
          patch: {
            boundaryBox: nextBox,
            ...(ratio !== 'full' ? { aspectRatio: ratio } : {}),
          },
        });
      }
    }
    if (canvasStore) {
      canvasStore.getState().setBoundaryBox(nextBox);
    }
  };
```

---

### 4-2. `[MODIFY]` `extension/features/canvas/components/QuickAnnotationCanvas.tsx`

#### 4-2-1. import の更新
##### Before
```tsx
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { translateScreenshotToProject } from '@/lib/tactical/acl/screenshot-translator';
import {
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';
```

##### After
```tsx
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  serializeProjectToScreenshotJson,
  translateScreenshotToProject,
} from '@/lib/tactical/acl/screenshot-translator';
import {
  type AspectRatio,
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';
```

#### 4-2-2. `QuickAnnotationCanvasInner` の `applyRatio` を `documentStore.dispatch({ type: 'UPDATE_PHASE' })` に更新
##### Before
```tsx
function QuickAnnotationCanvasInner(
  {
    className = '',
    imageAspect = 16 / 9,
  }: {
    className?: string;
    imageAspect?: number;
  },
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const stageRef = useRef<CanvasCoreHandle | null>(null);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);

  useImperativeHandle(
    ref,
    () => ({
      exportPng: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.exportPng(opts);
      },
      copyToClipboard: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.copyToClipboard(opts);
      },
      undo: () => stageRef.current?.undo(),
      redo: () => stageRef.current?.redo(),
      canUndo: () => stageRef.current?.canUndo() ?? false,
      canRedo: () => stageRef.current?.canRedo() ?? false,
      applyRatio: (ratio: AspectRatio | 'full') => {
        if (ratio === 'full') {
          setBoundaryBox({
            ...DEFAULT_BOUNDARY_BOX_FULL,
            enabled: true,
            visible: false,
          });
        } else {
          const newBox = createXBoundaryBox(ratio, '16:9');
          setBoundaryBox({
            ...newBox,
            enabled: true,
            visible: true,
          });
        }
      },
    }),
    [setBoundaryBox],
  );
```

##### After
```tsx
function QuickAnnotationCanvasInner(
  {
    className = '',
    imageAspect = 16 / 9,
  }: {
    className?: string;
    imageAspect?: number;
  },
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const stageRef = useRef<CanvasCoreHandle | null>(null);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const { documentStore, sessionStore } = useTacticalStoresContext();

  useImperativeHandle(
    ref,
    () => ({
      exportPng: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.exportPng(opts);
      },
      copyToClipboard: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.copyToClipboard(opts);
      },
      undo: () => stageRef.current?.undo(),
      redo: () => stageRef.current?.redo(),
      canUndo: () => stageRef.current?.canUndo() ?? false,
      canRedo: () => stageRef.current?.canRedo() ?? false,
      applyRatio: (ratio: AspectRatio | 'full') => {
        const nextBox: BoundaryBox =
          ratio === 'full'
            ? {
                ...DEFAULT_BOUNDARY_BOX_FULL,
                enabled: true,
                visible: false,
              }
            : {
                ...createXBoundaryBox(ratio, '16:9'),
                enabled: true,
                visible: true,
              };

        const docState = documentStore.getState();
        const activePhaseId =
          sessionStore.getState().activePhaseId ||
          docState.project.phases[0]?.id;
        if (activePhaseId) {
          docState.dispatch({
            type: 'UPDATE_PHASE',
            phaseId: activePhaseId,
            patch: {
              boundaryBox: nextBox,
              ...(ratio !== 'full' ? { aspectRatio: ratio } : {}),
            },
          });
        }
        setBoundaryBox(nextBox);
      },
    }),
    [setBoundaryBox, documentStore, sessionStore],
  );
```

#### 4-2-3. `QuickAnnotationCanvasBridge` の `onAutoSave` 双方向購読
##### Before
```tsx
function QuickAnnotationCanvasBridge(
  {
    screenshot,
    onAutoSave,
    className = '',
    imageAspect = 16 / 9,
  }: QuickAnnotationCanvasProps,
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const { documentStore } = useTacticalStoresContext();

  const handleCanvasAutoSave = useCallback(
    (annotationsJson: string) => {
      const bundle = translateScreenshotToProject({
        screenshotId: screenshot.id,
        backgroundImageUrl: screenshot.imageDataUrl,
        canvasAnnotationsJson: annotationsJson,
      });
      documentStore.getState().loadProject(bundle.project);
      onAutoSave?.(annotationsJson);
    },
    [screenshot.id, screenshot.imageDataUrl, documentStore, onAutoSave],
  );
```

##### After
```tsx
function QuickAnnotationCanvasBridge(
  {
    screenshot,
    onAutoSave,
    className = '',
    imageAspect = 16 / 9,
  }: QuickAnnotationCanvasProps,
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const { documentStore } = useTacticalStoresContext();
  const isSyncingFromCanvasRef = useRef(false);

  useEffect(() => {
    let prevProject = documentStore.getState().project;
    return documentStore.subscribe((state) => {
      if (state.project === prevProject) return;
      prevProject = state.project;
      if (isSyncingFromCanvasRef.current) return;
      const json = serializeProjectToScreenshotJson(state.project);
      onAutoSave?.(json);
    });
  }, [documentStore, onAutoSave]);

  const handleCanvasAutoSave = useCallback(
    (annotationsJson: string) => {
      isSyncingFromCanvasRef.current = true;
      try {
        const bundle = translateScreenshotToProject({
          screenshotId: screenshot.id,
          backgroundImageUrl: screenshot.imageDataUrl,
          canvasAnnotationsJson: annotationsJson,
        });
        documentStore.getState().loadProject(bundle.project);
      } finally {
        isSyncingFromCanvasRef.current = false;
      }
      onAutoSave?.(annotationsJson);
    },
    [screenshot.id, screenshot.imageDataUrl, documentStore, onAutoSave],
  );
```

---

### 4-3. `[MODIFY]` `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx`

`RatioPresetSelector` が `TacticalStoreProvider` 配下でマウントされた際に、比率ボタンクリックで `documentStore` の `UPDATE_PHASE` が発火し、`activeRatio` 表示が即座に更新されることを検証するテストを追加する。

#### 4-3-1. import の更新
##### Before
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core/types';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { QuickCanvasTopBar } from '../QuickCanvasTopBar';
```

##### After
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core/types';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { QuickCanvasTopBar } from '../QuickCanvasTopBar';
import { RatioPresetSelector } from '../RatioPresetSelector';
```

#### 4-3-2. テストケースの追加
##### Before
```tsx
    it('applies bg-blue-600 to primary X share button', () => {
      render(<QuickCanvasTopBar screenshot={mockScreenshot} />);

      const shareBtn = screen.getByRole('button', { name: 'X共有' });
      expect(shareBtn.className).toContain('bg-blue-600');
      expect(shareBtn.className).not.toContain('bg-sky-600');
    });
  });
});
```

##### After
```tsx
    it('applies bg-blue-600 to primary X share button', () => {
      render(<QuickCanvasTopBar screenshot={mockScreenshot} />);

      const shareBtn = screen.getByRole('button', { name: 'X共有' });
      expect(shareBtn.className).toContain('bg-blue-600');
      expect(shareBtn.className).not.toContain('bg-sky-600');
    });

    it('RatioPresetSelector dispatches UPDATE_PHASE to TacticalStoreProvider documentStore when clicked', () => {
      let capturedBoundaryWidth = 0;
      let capturedAspectRatio = '';

      function Inspector() {
        const { documentStore } = useTacticalStoresContext();
        documentStore.subscribe((state) => {
          const phase = state.project.phases[0];
          if (phase) {
            capturedBoundaryWidth = phase.boundaryBox.width;
            capturedAspectRatio = phase.aspectRatio;
          }
        });
        return <RatioPresetSelector />;
      }

      render(
        <TacticalStoreProvider>
          <Inspector />
        </TacticalStoreProvider>,
      );

      const ratio45Btn = screen.getByRole('button', {
        name: '境界線比率 4:5',
      });
      fireEvent.click(ratio45Btn);

      expect(capturedAspectRatio).toBe('4:5');
      expect(capturedBoundaryWidth).toBeGreaterThan(0);
      expect(capturedBoundaryWidth).toBeLessThan(100);
      expect(ratio45Btn.getAttribute('aria-pressed')).toBe('true');
    });
  });
});
```

---

### 4-4. `[MODIFY]` `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`

`applyRatio` 実行時に `documentStore` の `UPDATE_PHASE` が発火し、`serializeProjectToScreenshotJson` を通じて `onAutoSave` に最新の `boundaryBox` JSON が渡されることを検証する。

#### Before
```tsx
  it('supports applyRatio for boundaryBox aspect ratio presets', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();

    render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(typeof canvasRef.current?.applyRatio).toBe('function');
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('4:5');
      });
    }).not.toThrow();
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('full');
      });
    }).not.toThrow();
  });
```

#### After
```tsx
  it('supports applyRatio for boundaryBox aspect ratio presets and triggers onAutoSave via documentStore UPDATE_PHASE', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();
    const onAutoSaveSpy = vi.fn();

    render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          onAutoSave={onAutoSaveSpy}
          imageAspect={16 / 9}
        />
      </div>,
    );

    onAutoSaveSpy.mockClear();

    expect(typeof canvasRef.current?.applyRatio).toBe('function');
    act(() => {
      canvasRef.current?.applyRatio?.('4:5');
    });

    expect(onAutoSaveSpy).toHaveBeenCalled();
    const savedJson =
      onAutoSaveSpy.mock.calls[onAutoSaveSpy.mock.calls.length - 1][0];
    const parsed = JSON.parse(savedJson);
    expect(parsed.boundaryBox).toBeDefined();
    expect(parsed.boundaryBox.enabled).toBe(true);
    expect(parsed.boundaryBox.width).toBeLessThan(100);

    act(() => {
      canvasRef.current?.applyRatio?.('full');
    });
    const savedFullJson =
      onAutoSaveSpy.mock.calls[onAutoSaveSpy.mock.calls.length - 1][0];
    const parsedFull = JSON.parse(savedFullJson);
    expect(parsedFull.boundaryBox.width).toBe(100);
    expect(parsedFull.boundaryBox.height).toBe(100);
  });
```

---

### 4-5. `[DELETE]` 旧分割ドラフトタスクファイルの削除

- `[DELETE]` `tasks/TASK-180b-tactical-extension-store-unification.md`

---

### Phase 1 検証コマンド
```bash
bun run ai:check extension/features/canvas/components/RatioPresetSelector.tsx extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/__tests__/quick-top-bar.test.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx
```

### Worker Handoff Log
- Phase 1 実装完了: `createCanvasStore` 撤去、`TacticalStoresContext` の `UPDATE_PHASE` への一本化、`onAutoSave` 双方向購読配線、テスト全件 PASS。
