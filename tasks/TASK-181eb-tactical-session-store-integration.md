# TASK-181eb: SessionStore への画面状態統合と選択状態の置換（SessionStore 移設 2/2）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `refactor(tactical): integrate ui state into session store`
- **前提**: TASK-181ea が `DONE`（`session-ui-state.ts` / `session-ui-transitions.ts` が存在すること）。
- **Goal**: 新 `SessionStore`（Hot State）に画面状態とそのアクションを追加し、選択状態を `selectedIds`（ID 配列）から `selectedObjects`（種別付き）へ置換する。Consumer の移行は 181j/181k、旧ストア削除は 181l で行う。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -n "selectedIds|toggleSelectId|setSelectedIds" src/features/tactical-unified/stores/session-store.ts` ➔ 0 matches
  - `rg -n "s\.selectedIds" src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` ➔ 0 matches
  - `rg -n "'laser'" src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` ➔ 0 matches
  - Deleted files: なし

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 画面状態の更新（ツール切替・色・パネル開閉・選択）は `documentStore` の `past` と `isDirty` を一切変更しない。
  2. `SessionStore` は薄いシェル。遷移計算は `session-ui-transitions.ts` の純粋関数へ委譲し、`set()` 内へ直書きしない。
  3. `compileSceneGraph` へ渡す `EphemeralSessionState.selectedIds` の形は変えない。`useResolvedSceneGraph` が `selectedObjects` から導出する。
  4. 同値更新（色・線幅・フォントサイズ・マーカーモード・`isDragging`・`isHudOpen`・同一ワークスペースモード）は購読者を発火させない（旧 `ToolSlice` と同一）。
  5. 旧 `ToolSlice` / `TacticalUnifiedStore` / `canvasStore` の挙動は変更しない（Consumer 移行までの段階的状態。旧側は 181l で全削除）。
  6. `drawingPreview` は新 `SessionStore` の既存形（ScreenNorm 座標）のまま維持する。旧 `DrawingPreviewState`（ピクセル座標）の統合は 181j のスコープ。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx`（`initialSession` は `activePhaseId` / `activeSlideId` のみ指定のため変更不要。型互換を `tsc` で確認するのみ）

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: SessionStore 統合・選択状態置換・テスト更新
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts`
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts`
  - `[MODIFY]` `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

#### Task 1.1: `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L1-L37 インターフェース部)
- **Before**:
```ts
import { createStore, type StoreApi } from 'zustand';
import type {
  EphemeralDragDelta,
  EphemeralSessionState,
} from '@/lib/tactical/compiler/scene-graph-dto';

export interface SessionStoreState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly activeTool: string;
  readonly selectedIds: readonly string[];
  readonly activeDragDelta: EphemeralDragDelta | null;
  readonly drawingPreview: EphemeralSessionState['drawingPreview'] | null;

  readonly setActivePhaseId: (phaseId: string) => void;
  readonly setActiveSlideId: (slideId: string) => void;
  readonly setActiveTool: (tool: string) => void;
  readonly setSelectedIds: (ids: readonly string[]) => void;
  readonly toggleSelectId: (id: string, multi?: boolean) => void;
  readonly clearSelection: () => void;
  readonly setActiveDragDelta: (delta: EphemeralDragDelta | null) => void;
  readonly setDrawingPreview: (
    preview: EphemeralSessionState['drawingPreview'] | null,
  ) => void;
  readonly resetSession: (init?: Partial<SessionStoreState>) => void;
}

export type SessionStore = StoreApi<SessionStoreState>;

export interface CreateSessionStoreOptions {
  activePhaseId?: string;
  activeSlideId?: string;
  activeTool?: string;
  selectedIds?: readonly string[];
  activeDragDelta?: EphemeralDragDelta | null;
  drawingPreview?: EphemeralSessionState['drawingPreview'] | null;
}
```
- **After**:
```ts
import { createStore, type StoreApi } from 'zustand';
import type {
  EphemeralDragDelta,
  EphemeralSessionState,
} from '@/lib/tactical/compiler/scene-graph-dto';
import {
  DEFAULT_SESSION_UI_STATE,
  type DrawingTool,
  type ExportTarget,
  type MarkerMode,
  type MarkerOptionTab,
  type RightPanelTab,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
import {
  CLEARED_SELECTION,
  selectObjectsTransition,
  selectObjectTransition,
  splitPreviewTransition,
  transitionWorkspaceMode,
} from './session-ui-transitions';

export interface SessionStoreState extends SessionUiState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly activeDragDelta: EphemeralDragDelta | null;
  readonly drawingPreview: EphemeralSessionState['drawingPreview'] | null;

  readonly setActivePhaseId: (phaseId: string) => void;
  readonly setActiveSlideId: (slideId: string) => void;
  readonly setActiveDragDelta: (delta: EphemeralDragDelta | null) => void;
  readonly setDrawingPreview: (
    preview: EphemeralSessionState['drawingPreview'] | null,
  ) => void;
  readonly resetSession: (init?: Partial<SessionStoreState>) => void;

  readonly setActiveTool: (tool: DrawingTool) => void;
  readonly setContinuousDrawing: (val: boolean) => void;
  readonly toggleContinuousDrawing: () => void;
  readonly setColor: (color: string) => void;
  readonly setCustomColor: (color: string) => void;
  readonly setStrokeWidth: (width: number) => void;
  readonly setFontSize: (size: number) => void;
  readonly setMarkerMode: (mode: MarkerMode) => void;
  readonly setIsDragging: (dragging: boolean) => void;
  readonly setIsHudOpen: (open: boolean) => void;
  readonly setConnectingPlayerId: (id: string | null) => void;
  readonly setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  readonly setTeamVisibility: (visibility: TeamVisibility) => void;

  readonly selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  readonly selectObjects: (
    objects: readonly SelectedObject[],
    multi?: boolean,
  ) => void;
  readonly clearSelection: () => void;

  readonly setWorkspaceMode: (mode: WorkspaceMode) => void;
  readonly toggleWorkspaceMode: () => void;
  readonly toggleSidebar: () => void;
  readonly setSidebarOpen: (open: boolean) => void;
  readonly setInspectorOpen: (open: boolean) => void;
  readonly setRightPanelTab: (tab: RightPanelTab) => void;
  readonly toggleRightPanel: () => void;
  readonly setRightPanelOpen: (open: boolean) => void;
  readonly toggleSplitPreview: () => void;
  readonly setSplitPreviewOpen: (open: boolean) => void;
  readonly openExportModal: (target?: ExportTarget) => void;
  readonly closeExportModal: () => void;
  readonly openProjectManagerModal: () => void;
  readonly closeProjectManagerModal: () => void;
}

export type SessionStore = StoreApi<SessionStoreState>;

export type CreateSessionStoreOptions = Partial<SessionUiState> & {
  activePhaseId?: string;
  activeSlideId?: string;
  activeDragDelta?: EphemeralDragDelta | null;
  drawingPreview?: EphemeralSessionState['drawingPreview'] | null;
};
```

#### Task 1.2: `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts` (L39-L90 `createSessionStore` 本体)
- **Before**:
```ts
export function createSessionStore(
  initial?: CreateSessionStoreOptions,
): SessionStore {
  return createStore<SessionStoreState>((set) => ({
    activePhaseId: initial?.activePhaseId ?? '',
    activeSlideId: initial?.activeSlideId ?? '',
    activeTool: initial?.activeTool ?? 'select',
    selectedIds: initial?.selectedIds ?? [],
    activeDragDelta: initial?.activeDragDelta ?? null,
    drawingPreview: initial?.drawingPreview ?? null,

    setActivePhaseId: (phaseId: string) => set({ activePhaseId: phaseId }),

    setActiveSlideId: (slideId: string) => set({ activeSlideId: slideId }),

    setActiveTool: (tool: string) => set({ activeTool: tool }),

    setSelectedIds: (ids: readonly string[]) => set({ selectedIds: ids }),

    toggleSelectId: (id: string, multi = false) => {
      set((state) => {
        if (!multi) {
          const isAlreadySingle =
            state.selectedIds.length === 1 && state.selectedIds[0] === id;
          return { selectedIds: isAlreadySingle ? [] : [id] };
        }
        const exists = state.selectedIds.includes(id);
        const nextIds = exists
          ? state.selectedIds.filter((item) => item !== id)
          : [...state.selectedIds, id];
        return { selectedIds: nextIds };
      });
    },

    clearSelection: () => set({ selectedIds: [] }),

    setActiveDragDelta: (delta: EphemeralDragDelta | null) =>
      set({ activeDragDelta: delta }),

    setDrawingPreview: (
      preview: EphemeralSessionState['drawingPreview'] | null,
    ) => set({ drawingPreview: preview }),

    resetSession: (init?: Partial<SessionStoreState>) =>
      set((state) => ({
        ...state,
        activeDragDelta: null,
        drawingPreview: null,
        ...init,
      })),
  }));
}
```
- **After**（同期間を以下で完全置換する）:
```ts
export function createSessionStore(
  initial?: CreateSessionStoreOptions,
): SessionStore {
  const {
    activePhaseId,
    activeSlideId,
    activeDragDelta,
    drawingPreview,
    ...initialUi
  } = initial ?? {};

  return createStore<SessionStoreState>((set) => ({
    ...DEFAULT_SESSION_UI_STATE,
    ...initialUi,
    activePhaseId: activePhaseId ?? '',
    activeSlideId: activeSlideId ?? '',
    activeDragDelta: activeDragDelta ?? null,
    drawingPreview: drawingPreview ?? null,

    setActivePhaseId: (phaseId: string) => set({ activePhaseId: phaseId }),
    setActiveSlideId: (slideId: string) => set({ activeSlideId: slideId }),
    setActiveDragDelta: (delta: EphemeralDragDelta | null) =>
      set({ activeDragDelta: delta }),
    setDrawingPreview: (
      preview: EphemeralSessionState['drawingPreview'] | null,
    ) => set({ drawingPreview: preview }),
    resetSession: (init?: Partial<SessionStoreState>) =>
      set((state) => ({
        ...state,
        activeDragDelta: null,
        drawingPreview: null,
        ...init,
      })),

    setActiveTool: (tool) => set({ activeTool: tool }),
    setContinuousDrawing: (val) => set({ continuousDrawing: val }),
    toggleContinuousDrawing: () =>
      set((s) => ({ continuousDrawing: !s.continuousDrawing })),
    setColor: (color) => set((s) => (s.color === color ? s : { color })),
    setCustomColor: (customColor) =>
      set((s) => (s.customColor === customColor ? s : { customColor })),
    setStrokeWidth: (strokeWidth) =>
      set((s) => (s.strokeWidth === strokeWidth ? s : { strokeWidth })),
    setFontSize: (fontSize) =>
      set((s) => (s.fontSize === fontSize ? s : { fontSize })),
    setMarkerMode: (markerMode) =>
      set((s) => (s.markerMode === markerMode ? s : { markerMode })),
    setIsDragging: (isDragging) =>
      set((s) => (s.isDragging === isDragging ? s : { isDragging })),
    setIsHudOpen: (isHudOpen) =>
      set((s) => (s.isHudOpen === isHudOpen ? s : { isHudOpen })),
    setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),
    setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),

    selectObject: (obj, multi = false) =>
      set((s) => selectObjectTransition(s, obj, multi)),
    selectObjects: (objects, multi = false) =>
      set((s) => selectObjectsTransition(s, objects, multi)),
    clearSelection: () => set({ ...CLEARED_SELECTION }),

    setWorkspaceMode: (mode) =>
      set((s) =>
        s.workspaceMode === mode ? s : transitionWorkspaceMode(s, mode),
      ),
    toggleWorkspaceMode: () =>
      set((s) =>
        transitionWorkspaceMode(
          s,
          s.workspaceMode === 'board' ? 'director' : 'board',
        ),
      ),
    toggleSidebar: () =>
      set((s) => ({
        panels: { ...s.panels, sidebarOpen: !s.panels.sidebarOpen },
      })),
    setSidebarOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, sidebarOpen: open } })),
    setInspectorOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, inspectorOpen: open } })),
    setRightPanelTab: (tab) =>
      set((s) => ({
        panels: { ...s.panels, rightPanelTab: tab, inspectorOpen: true },
      })),
    toggleRightPanel: () =>
      set((s) => ({
        panels: { ...s.panels, isRightPanelOpen: !s.panels.isRightPanelOpen },
      })),
    setRightPanelOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, isRightPanelOpen: open } })),
    toggleSplitPreview: () =>
      set((s) => splitPreviewTransition(s.panels, !s.panels.splitPreviewOpen)),
    setSplitPreviewOpen: (open) =>
      set((s) => splitPreviewTransition(s.panels, open)),
    openExportModal: (target) =>
      set((s) => ({
        pendingExport: target ?? null,
        panels: { ...s.panels, exportModalOpen: true },
      })),
    closeExportModal: () =>
      set((s) => ({
        pendingExport: null,
        panels: { ...s.panels, exportModalOpen: false },
      })),
    openProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: true } })),
    closeProjectManagerModal: () =>
      set((s) => ({ panels: { ...s.panels, projectManagerModalOpen: false } })),
  }));
}
```

#### Task 1.3: `[MODIFY]` `src/features/tactical-unified/hooks/use-resolved-scene-graph.ts` (L106-L117)
- **Before**:
```ts
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedIds = useSessionStore((s) => s.selectedIds);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const timeMs = usePlaybackStore((s) => s.timeMs);

  const session: EphemeralSessionState = useMemo(
```
- **After**:
```ts
  const project = useDocumentStore((s) => s.project);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const activeDragDelta = useSessionStore((s) => s.activeDragDelta);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const timeMs = usePlaybackStore((s) => s.timeMs);

  const selectedIds = useMemo(
    () => selectedObjects.map((o) => o.id),
    [selectedObjects],
  );

  const session: EphemeralSessionState = useMemo(
```

#### Task 1.4: `[MODIFY]` `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (L175-L180)
- **Before**:
```ts
        sessionStore.getState().resetSession({
          activePhaseId: state.activePhaseId,
          activeSlideId: state.activeSlideId,
          activeTool: state.activeTool,
          selectedIds: state.selectedObjects.map((o) => o.id),
        });
```
- **After**:
```ts
        sessionStore.getState().resetSession({
          activePhaseId: state.activePhaseId,
          activeSlideId: state.activeSlideId,
          activeTool: state.activeTool,
          selectedObjects: state.selectedObjects,
        });
```
- 注意: L151 の `canvasStore.setState({ selectedIds: ... })` は旧 `canvasStore` の項目であり変更しない。

#### Task 1.5: `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`
- **変更1** (L235): `expect(sessionStore.getState().selectedIds).toEqual([]);` ➔ `expect(sessionStore.getState().selectedObjects).toEqual([]);`
- **変更2** (L250-L254):
- **Before**:
```ts
      sessionStore.getState().setSelectedIds(['player-1', 'arrow-1']);
      expect(sessionStore.getState().selectedIds).toEqual([
        'player-1',
        'arrow-1',
      ]);
```
- **After**:
```ts
      sessionStore.getState().selectObjects([
        { id: 'player-1', kind: 'player' },
        { id: 'arrow-1', kind: 'arrow' },
      ]);
      expect(
        sessionStore.getState().selectedObjects.map((o) => o.id),
      ).toEqual(['player-1', 'arrow-1']);
```
- **変更3** (L394-L396): `setActiveTool('laser')` と `toBe('laser')` を、有効な `DrawingTool` である `'pan'` に置換する。
- **変更4**: `describe('Hot Store (SessionStore)', ...)` の閉じ括弧直後（L259 の直後）に以下の `describe` を追加する。
```ts
  describe('Hot Store UI 状態（ツール・色・パネル・ワークスペース）', () => {
    it('同値の色・線幅の設定では購読者が発火しないこと', () => {
      const sessionStore = createSessionStore();
      const listener = vi.fn();
      sessionStore.subscribe(listener);

      sessionStore.getState().setColor('#ffffff');
      sessionStore.getState().setStrokeWidth(2);
      expect(listener).not.toHaveBeenCalled();

      sessionStore.getState().setColor('#ef4444');
      expect(listener).toHaveBeenCalledTimes(1);
      expect(sessionStore.getState().color).toBe('#ef4444');
    });

    it('director への切替でパネル状態を退避し、board 復帰で復元すること', () => {
      const sessionStore = createSessionStore();
      sessionStore.getState().setSidebarOpen(true);
      sessionStore.getState().setRightPanelOpen(true);

      sessionStore.getState().setWorkspaceMode('director');
      let s = sessionStore.getState();
      expect(s.workspaceMode).toBe('director');
      expect(s.panels.sidebarOpen).toBe(false);
      expect(s.panels.rightPanelTab).toBe('camera');
      expect(s.savedPanelStateBeforeDirector).toEqual({
        sidebarOpen: true,
        isRightPanelOpen: true,
      });

      sessionStore.getState().toggleWorkspaceMode();
      s = sessionStore.getState();
      expect(s.workspaceMode).toBe('board');
      expect(s.panels.sidebarOpen).toBe(true);
      expect(s.panels.isRightPanelOpen).toBe(true);
      expect(s.panels.rightPanelTab).toBe('formation');
      expect(s.savedPanelStateBeforeDirector).toBeNull();
    });

    it('selectObject は単一選択・複数トグル・null 解除を行うこと', () => {
      const sessionStore = createSessionStore();
      sessionStore.getState().selectObject({ id: 'p1', kind: 'player' });
      sessionStore.getState().selectObject({ id: 'a1', kind: 'arrow' }, true);
      expect(
        sessionStore.getState().selectedObjects.map((o) => o.id),
      ).toEqual(['p1', 'a1']);

      sessionStore.getState().selectObject({ id: 'p1', kind: 'player' }, true);
      expect(
        sessionStore.getState().selectedObjects.map((o) => o.id),
      ).toEqual(['a1']);

      sessionStore.getState().selectObject(null);
      expect(sessionStore.getState().selectedObjects).toEqual([]);
      expect(sessionStore.getState().activeMarkerOptionTab).toBeNull();
    });

    it('選手1件の selectObjects で視野角タブが開き、clearSelection で閉じること', () => {
      const sessionStore = createSessionStore();
      sessionStore.getState().selectObjects([{ id: 'p1', kind: 'player' }]);
      expect(sessionStore.getState().activeMarkerOptionTab).toBe('vision');

      sessionStore.getState().clearSelection();
      expect(sessionStore.getState().selectedObjects).toEqual([]);
      expect(sessionStore.getState().activeMarkerOptionTab).toBeNull();
    });

    it('スプリットプレビューを開くと右パネルが閉じること', () => {
      const sessionStore = createSessionStore();
      sessionStore.getState().setRightPanelOpen(true);
      sessionStore.getState().toggleSplitPreview();
      expect(sessionStore.getState().panels.splitPreviewOpen).toBe(true);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(false);
    });

    it('エクスポート画面の開閉で pendingExport が設定・解除されること', () => {
      const sessionStore = createSessionStore();
      sessionStore
        .getState()
        .openExportModal({ format: 'png', scope: 'current', scale: 2 });
      expect(sessionStore.getState().panels.exportModalOpen).toBe(true);
      expect(sessionStore.getState().pendingExport?.format).toBe('png');

      sessionStore.getState().closeExportModal();
      expect(sessionStore.getState().panels.exportModalOpen).toBe(false);
      expect(sessionStore.getState().pendingExport).toBeNull();
    });

    it('UI 状態の更新が documentStore の past と isDirty に影響しないこと', () => {
      const documentStore = createDocumentStore(createDummyProject());
      const sessionStore = createSessionStore();

      sessionStore.getState().setActiveTool('pan');
      sessionStore.getState().setColor('#00ff00');
      sessionStore.getState().toggleSidebar();
      sessionStore.getState().selectObject({ id: 'player-1', kind: 'player' });

      expect(documentStore.getState().past).toHaveLength(0);
      expect(documentStore.getState().isDirty).toBe(false);
    });
  });
```

- **Phase Verification**:
  - [x] 1. `rg -n "selectedIds|toggleSelectId|setSelectedIds" src/features/tactical-unified/stores/session-store.ts` が 0 件であること
  - [x] 2. `bun run ai:check src/features/tactical-unified/stores/session-store.ts src/features/tactical-unified/hooks/use-resolved-scene-graph.ts src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts` が PASS すること
- **Worker Handoff Log**:
```
Phase 1 完了: SessionStore への UI 状態統合・selectedObjects 置換・useResolvedSceneGraph / FullTacticalCanvas / three-frequency-stores.test.ts 更新、ai:check (17 tests) PASS。
```

## 4. 次タスクへの申し送り（スコープ外）
- 181f: 選手の装飾（ゴースト軌道・視野角・接続線・バッジ・スポットライト）とボール操作の SlideCommand 追加。
- 181j/181k: Consumer を `useSessionStore` へ移行し、旧 `DrawingPreviewState`（ピクセル座標）を `SessionStore.drawingPreview` へ統合する。
- 181l: 旧 `ToolSlice` / `TacticalUnifiedStore` / `canvasStore` と、`tool-types.ts` の再 export を削除する。
