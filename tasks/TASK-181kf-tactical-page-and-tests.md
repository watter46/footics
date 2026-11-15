# TASK-181kf: TacticalUnifiedPage エントリーポイント・Page統合テスト・BallHudテスト橋渡し

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181ja, TASK-181kb, TASK-181kca, TASK-181kcb, TASK-181ke
- **Commit**: `refactor(tactical): migrate TacticalUnifiedPage and page integration tests to TacticalStoreProvider`

---

## 🎯 目的・背景

`src/features/tactical-unified/tactical-unified-page.tsx` から `tactical-unified-store`・`TacticalUnifiedStoreProvider` への依存を完全撤廃し、`TacticalStoreProvider`（3周波数ストア）と `Dispatch` コマンドベースオーケストレーションへ移行する。併せて `tactical-page.test.tsx`・`tactical-unified-page-integration.test.tsx`、および `TASK-181kb` で移行した `BallHud` を検証する `context-hud.test.tsx` の該当テストを更新する。

## 🚨 残存禁止条件 (Negative Contracts)

- `tactical-unified-page.tsx`・`tactical-page.test.tsx`・`tactical-unified-page-integration.test.tsx` に `tactical-unified-store` / `tactical-unified-store-provider` / `@/lib/types/tactical-unified` を一切残してはならない。
- 新設・更新するテストで `vi.mock` による内部ストア・内部フックのモックを追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `tactical-unified-page.tsx`・`tactical-page.test.tsx`・`tactical-unified-page-integration.test.tsx` 移行（1プロダクション + 2テスト）
- **Phase 2**: `context-hud.test.tsx` 内 `BallHud` テストの `TacticalStoreProvider` 対応（1テスト）

---

### Phase 1: Page オーケストレーション・Page テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/app/tactical/__tests__/tactical-page.test.tsx`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/tactical-unified-page.tsx`

**Before:**
```tsx
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import { useTacticalShortcuts } from '@/features/tactical-unified/hooks/use-tactical-shortcuts';
import type { TacticalUnifiedState } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  TacticalUnifiedStoreProvider,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import { useKeyboardShortcuts } from '@/features/tactical-unified/hooks/use-keyboard-shortcuts';
import { useTacticalAutoSave } from '@/features/tactical-unified/hooks/use-tactical-auto-save';
import { useTacticalDropPaste } from '@/features/tactical-unified/hooks/use-tactical-drop-paste';
import type { TacticalMatchInitialState } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { useTacticalShortcuts } from '@/features/tactical-unified/hooks/use-tactical-shortcuts';
import type { CreateSessionStoreOptions } from '@/features/tactical-unified/stores/session-store';
import {
  TacticalStoreProvider,
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
```

**Before:**
```tsx
export interface TacticalUnifiedPageProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: Partial<TacticalUnifiedState>;
}

export function TacticalUnifiedPage({
  initialMatchId,
  initialMinute,
  initialState,
}: TacticalUnifiedPageProps = {}) {
  return (
    <TacticalUnifiedStoreProvider initialState={initialState}>
      <TacticalPlayerPhotoProvider>
        <TacticalUnifiedPageContent
          initialMatchId={initialMatchId}
          initialMinute={initialMinute}
          initialState={initialState}
        />
      </TacticalPlayerPhotoProvider>
    </TacticalUnifiedStoreProvider>
  );
}

interface TacticalUnifiedPageContentProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: Partial<TacticalUnifiedState>;
}
```
**After:**
```tsx
export interface TacticalUnifiedPageProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: TacticalMatchInitialState;
  initialSession?: CreateSessionStoreOptions;
}

export function TacticalUnifiedPage({
  initialMatchId,
  initialMinute,
  initialState,
  initialSession,
}: TacticalUnifiedPageProps = {}) {
  const mergedInitialSession: CreateSessionStoreOptions | undefined =
    initialState || initialSession
      ? {
          ...initialSession,
          ...(initialState?.activePhaseId
            ? { activePhaseId: initialState.activePhaseId }
            : {}),
          ...(initialState?.activeSlideId
            ? { activeSlideId: initialState.activeSlideId }
            : {}),
        }
      : undefined;

  return (
    <TacticalStoreProvider
      initialProject={initialState?.project}
      initialSession={mergedInitialSession}
    >
      <TacticalPlayerPhotoProvider>
        <TacticalUnifiedPageContent
          initialMatchId={initialMatchId}
          initialMinute={initialMinute}
          initialState={initialState}
        />
      </TacticalPlayerPhotoProvider>
    </TacticalStoreProvider>
  );
}

interface TacticalUnifiedPageContentProps {
  initialMatchId?: string;
  initialMinute?: number;
  initialState?: TacticalMatchInitialState;
}
```

**Before:**
```tsx
  const exportModalOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.exportModalOpen,
  );
  const projectManagerModalOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useTacticalUnifiedStoreContext(
    (s) => s.closeProjectManagerModal,
  );
  const sidebarOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.sidebarOpen,
  );
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const isDirectorMode = workspaceMode === 'director';
```
**After:**
```tsx
  const exportModalOpen = useSessionStore((s) => s.panels.exportModalOpen);
  const projectManagerModalOpen = useSessionStore(
    (s) => s.panels.projectManagerModalOpen,
  );
  const closeProjectManagerModal = useSessionStore(
    (s) => s.closeProjectManagerModal,
  );
  const sidebarOpen = useSessionStore((s) => s.panels.sidebarOpen);
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const isDirectorMode = workspaceMode === 'director';
```

**Before:**
```tsx
  const movePlayerToPitch = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToPitch,
  );
  const movePlayerToBench = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToBench,
  );
  const phases = useTacticalUnifiedStoreContext((s) => s.project.phases);
  const activePhaseId = useTacticalUnifiedStoreContext((s) => s.activePhaseId);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const selectPhaseAndSlide = useTacticalUnifiedStoreContext(
    (s) => s.selectPhaseAndSlide,
  );
  const addPhase = useTacticalUnifiedStoreContext((s) => s.addPhase);
  const deletePhase = useTacticalUnifiedStoreContext((s) => s.deletePhase);
  const renamePhase = useTacticalUnifiedStoreContext((s) => s.renamePhase);
  const setActivePhase = useTacticalUnifiedStoreContext(
    (s) => s.setActivePhase,
  );
  const addSlide = useTacticalUnifiedStoreContext((s) => s.addSlide);

  const handleDndEnd = (event: DragEndEvent) => {
    handleTacticalDndEnd(event, {
      activeSlideId,
      movePlayerToPitch,
      movePlayerToBench,
    });
  };
```
**After:**
```tsx
  const phases = useDocumentStore((s) => s.project.phases);
  const pitchAppearance = useDocumentStore((s) => s.project.pitchAppearance);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);

  const handleDndEnd = (event: DragEndEvent) => {
    handleTacticalDndEnd(event, {
      activeSlideId,
      movePlayerToPitch: (slideId, playerId, x, y) => {
        dispatchSlide(activePhaseId, slideId, {
          type: 'MOVE_PLAYER_TO_PITCH',
          id: playerId,
          x: clampToScreenNorm(x),
          y: clampToScreenNorm(y),
        });
      },
      movePlayerToBench: (slideId, playerId) => {
        dispatchSlide(activePhaseId, slideId, {
          type: 'MOVE_PLAYER_TO_BENCH',
          id: playerId,
        });
      },
    });
  };
```

**Before:**
```tsx
          {!isFocusMode && sidebarOpen && (
            <LeftPanel
              phases={phases}
              activePhaseId={activePhaseId}
              activeSlideId={activeSlideId}
              pitchAppearance={pitchAppearance}
              onSelectScene={selectPhaseAndSlide}
              onAddPhase={() => addPhase()}
              onDeletePhase={deletePhase}
              onRenamePhase={renamePhase}
              onAddSlideToPhase={(phaseId) => {
                if (phaseId !== activePhaseId) {
                  setActivePhase(phaseId);
                }
                addSlide(undefined, 'full');
              }}
            />
          )}
```
**After:**
```tsx
          {!isFocusMode && sidebarOpen && (
            <LeftPanel
              phases={phases}
              activePhaseId={activePhaseId}
              activeSlideId={activeSlideId}
              pitchAppearance={pitchAppearance}
              onSelectScene={(phaseId, slideId) => {
                setActivePhaseId(phaseId);
                setActiveSlideId(slideId);
              }}
              onAddPhase={() => {
                const newPhaseId = crypto.randomUUID();
                const newSlideId = crypto.randomUUID();
                dispatch({
                  type: 'ADD_PHASE',
                  name: `Phase ${phases.length + 1}`,
                  newPhaseId,
                  newSlideId,
                });
                setActivePhaseId(newPhaseId);
                setActiveSlideId(newSlideId);
              }}
              onDeletePhase={(phaseId) => {
                const remaining = phases.filter((p) => p.id !== phaseId);
                dispatch({ type: 'DELETE_PHASE', phaseId });
                if (phaseId === activePhaseId && remaining.length > 0) {
                  const fallback = remaining[0];
                  setActivePhaseId(fallback.id);
                  setActiveSlideId(fallback.slides[0]?.id ?? '');
                }
              }}
              onRenamePhase={(phaseId, name) => {
                dispatch({
                  type: 'UPDATE_PHASE',
                  phaseId,
                  patch: { name },
                });
              }}
              onAddSlideToPhase={(phaseId) => {
                const newSlideId = crypto.randomUUID();
                dispatch({
                  type: 'ADD_SLIDE',
                  phaseId,
                  mode: 'full',
                  newSlideId,
                });
                setActivePhaseId(phaseId);
                setActiveSlideId(newSlideId);
              }}
            />
          )}
```

#### Task 1.2 `[MODIFY]` `src/app/tactical/__tests__/tactical-page.test.tsx`

**Before:**
```tsx
import type { TacticalUnifiedState } from '@/features/tactical-unified/stores/tactical-unified-store';
import { db } from '@/lib/db';
import TacticalError from '../error';
import TacticalPage, { dynamic } from '../page';
import { TacticalClientPage } from '../tactical-client-page';

const { MockTacticalUnifiedPage } = vi.hoisted(() => {
  return {
    MockTacticalUnifiedPage: ({
      initialMatchId,
      initialMinute,
      initialState,
    }: {
      initialMatchId?: string;
      initialMinute?: number;
      initialState?: Partial<TacticalUnifiedState>;
    }) => (
```
**After:**
```tsx
import type { TacticalMatchInitialState } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import { db } from '@/lib/db';
import TacticalError from '../error';
import TacticalPage, { dynamic } from '../page';
import { TacticalClientPage } from '../tactical-client-page';

const { MockTacticalUnifiedPage } = vi.hoisted(() => {
  return {
    MockTacticalUnifiedPage: ({
      initialMatchId,
      initialMinute,
      initialState,
    }: {
      initialMatchId?: string;
      initialMinute?: number;
      initialState?: TacticalMatchInitialState;
    }) => (
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultProject } from '@/lib/types/tactical-unified';
import { TacticalUnifiedPage } from '../tactical-unified-page';
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultTacticalProject } from '../stores/tactical-store-provider';
import { TacticalUnifiedPage } from '../tactical-unified-page';
```

**Before:**
```tsx
  it('initialState で projectManagerModalOpen: true を確定注入した場合、モーダルが表示されること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: true,
          },
        }}
      />,
    );

    expect(screen.getByRole('application')).toBeDefined();
    // initialState の確定注入により projectManagerModal が開いていること
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('戦術プロジェクト管理')).toBeDefined();
  });

  it('\\ キー押下により集中モードが切り替わり、左右パネルの表示がトグルされること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    // 初期状態では Tactical Phases (LeftPanel) や Formation (RightPanel) が表示されている
    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();

    // '\\' キー押下で集中モード ON
    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    // 左右パネルが非表示になる
    expect(screen.queryByLabelText('Tactical Phases')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Formation' })).toBeNull();

    // 再度 '\\' キー押下で集中モード OFF
    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();
  });

  it('initialState で渡したプロジェクト情報（タイトル等）が初期描画から即座に反映されること', async () => {
    const customProject = createDefaultProject('custom-project-1');
    customProject.title = 'Champions League Final Tactics';

    render(
      <TacticalUnifiedPage
        initialState={{
          project: customProject,
        }}
      />,
    );

    expect(screen.getByText('Champions League Final Tactics')).toBeDefined();
  });

  it('TopBar の Toggle 3D Split Preview ボタン押下で 3D プレビューパネルが展開され、右パネルが自動折りたたみされること', async () => {
    render(
      <TacticalUnifiedPage
        initialState={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: false,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );
```
**After:**
```tsx
  it('initialSession で projectManagerModalOpen: true を確定注入した場合、モーダルが表示されること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: true,
          },
        }}
      />,
    );

    expect(screen.getByRole('application')).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('戦術プロジェクト管理')).toBeDefined();
  });

  it('\\ キー押下により集中モードが切り替わり、左右パネルの表示がトグルされること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: true,
            rightPanelTab: 'formation',
            isRightPanelOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );

    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();

    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    expect(screen.queryByLabelText('Tactical Phases')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Formation' })).toBeNull();

    fireEvent.keyDown(window, { key: '\\', code: 'Backslash' });

    expect(screen.getByLabelText('Tactical Phases')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Formation' })).toBeDefined();
  });

  it('initialState で渡したプロジェクト情報（タイトル等）が初期描画から即座に反映されること', async () => {
    const base = createDefaultTacticalProject();
    const customProject = {
      ...base,
      id: 'custom-project-1',
      title: 'Champions League Final Tactics',
    };

    render(
      <TacticalUnifiedPage
        initialState={{
          project: customProject,
          activePhaseId: customProject.phases[0]!.id,
          activeSlideId: customProject.phases[0]!.slides[0]!.id,
        }}
      />,
    );

    expect(screen.getByText('Champions League Final Tactics')).toBeDefined();
  });

  it('TopBar の Toggle 3D Split Preview ボタン押下で 3D プレビューパネルが展開され、右パネルが自動折りたたみされること', async () => {
    render(
      <TacticalUnifiedPage
        initialSession={{
          panels: {
            sidebarOpen: true,
            inspectorOpen: false,
            rightPanelTab: 'formation',
            isRightPanelOpen: true,
            splitPreviewOpen: false,
            exportModalOpen: false,
            projectManagerModalOpen: false,
          },
        }}
      />,
    );
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx src/app/tactical/__tests__/tactical-page.test.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx
  ```

---

### Phase 2: `context-hud.test.tsx` 内 `BallHud` テストの `TacticalStoreProvider` 対応

- **担当ファイル**:
  - `src/features/tactical-unified/__tests__/context-hud.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/__tests__/context-hud.test.tsx`

**Before:**
```tsx
import {
  createTacticalUnifiedStore,
  TacticalUnifiedStoreContext,
} from '../stores/tactical-unified-store';
```
**After:**
```tsx
import { createDocumentStore } from '../stores/document-store';
import { createPlaybackStore } from '../stores/playback-store';
import { createSessionStore } from '../stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '../stores/tactical-store-provider';
import {
  createTacticalUnifiedStore,
  TacticalUnifiedStoreContext,
} from '../stores/tactical-unified-store';
```

**Before:**
```tsx
    it('BallHud 単体でスライダー操作時に setBallSizeScale が呼ばれる', () => {
      const store = createTacticalUnifiedStore();
      const setBallSizeScaleSpy = vi.spyOn(
        store.getState(),
        'setBallSizeScale',
      );

      render(
        <TacticalUnifiedStoreContext.Provider value={store}>
          <BallHud />
        </TacticalUnifiedStoreContext.Provider>,
      );

      const slider = screen.getByLabelText('ボールサイズ') as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.value).toBe('1');
      expect(screen.getByText('1.0x')).toBeDefined();

      fireEvent.change(slider, { target: { value: '1.5' } });

      const activeSlideId = store.getState().activeSlideId;
      expect(setBallSizeScaleSpy).toHaveBeenCalledWith(activeSlideId, 1.5);
    });

    it('ContextHud で ball 選択時に BallHud が描画される', () => {
      const canvasStore = createCanvasStore({ mode: 'full-tactical' });
      canvasStore.setState({
        selectedObjects: [{ id: 'ball', kind: 'ball' }],
        isHudOpen: true,
        isDragging: false,
        activeTool: 'select',
      });

      const tacticalStore = createTacticalUnifiedStore();
      const mockNode = {
        getClientRect: () => ({
          x: 200,
          y: 200,
          width: 20,
          height: 20,
        }),
      } as unknown as import('konva/lib/Group').Group;

      const nodesRegistryRef = {
        current: createMockRegistry({
          ballNode: mockNode,
        }),
      };

      render(
        <TacticalUnifiedStoreContext.Provider value={tacticalStore}>
          <CanvasStoreProvider store={canvasStore}>
            <ContextHud
              stageSize={{ width: 800, height: 600 }}
              nodesRegistryRef={nodesRegistryRef}
            />
          </CanvasStoreProvider>
        </TacticalUnifiedStoreContext.Provider>,
      );
```
**After:**
```tsx
    it('BallHud 単体でスライダー操作時にボールサイズが更新される', () => {
      const project = createDefaultTacticalProject();
      const phaseId = project.phases[0]!.id;
      const slideId = project.phases[0]!.slides[0]!.id;
      const documentStore = createDocumentStore(project);
      const sessionStore = createSessionStore({
        activePhaseId: phaseId,
        activeSlideId: slideId,
      });
      const playbackStore = createPlaybackStore();

      render(
        <TacticalStoreProvider
          stores={{ documentStore, sessionStore, playbackStore }}
        >
          <BallHud />
        </TacticalStoreProvider>,
      );

      const slider = screen.getByLabelText('ボールサイズ') as HTMLInputElement;
      expect(slider).toBeDefined();
      expect(slider.value).toBe('1');
      expect(screen.getByText('1.0x')).toBeDefined();

      fireEvent.change(slider, { target: { value: '1.5' } });

      expect(
        documentStore.getState().project.phases[0]?.slides[0]?.ball.sizeScale,
      ).toBe(1.5);
    });

    it('ContextHud で ball 選択時に BallHud が描画される', () => {
      const canvasStore = createCanvasStore({ mode: 'full-tactical' });
      canvasStore.setState({
        selectedObjects: [{ id: 'ball', kind: 'ball' }],
        isHudOpen: true,
        isDragging: false,
        activeTool: 'select',
      });

      const tacticalStore = createTacticalUnifiedStore();
      const project = createDefaultTacticalProject();
      const documentStore = createDocumentStore(project);
      const sessionStore = createSessionStore({
        activePhaseId: project.phases[0]!.id,
        activeSlideId: project.phases[0]!.slides[0]!.id,
      });
      const playbackStore = createPlaybackStore();
      const mockNode = {
        getClientRect: () => ({
          x: 200,
          y: 200,
          width: 20,
          height: 20,
        }),
      } as unknown as import('konva/lib/Group').Group;

      const nodesRegistryRef = {
        current: createMockRegistry({
          ballNode: mockNode,
        }),
      };

      render(
        <TacticalStoreProvider
          stores={{ documentStore, sessionStore, playbackStore }}
        >
          <TacticalUnifiedStoreContext.Provider value={tacticalStore}>
            <CanvasStoreProvider store={canvasStore}>
              <ContextHud
                stageSize={{ width: 800, height: 600 }}
                nodesRegistryRef={nodesRegistryRef}
              />
            </CanvasStoreProvider>
          </TacticalUnifiedStoreContext.Provider>
        </TacticalStoreProvider>,
      );
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/__tests__/context-hud.test.tsx
  ```
