# TASK-181ea: 画面状態の型・純粋遷移関数の追加（SessionStore 移設の基盤 1/2）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `refactor(tactical): add session ui state types and pure transitions`
- **Series**: 旧ストア完全廃止シリーズ。181ea（本タスク）→ 181eb（SessionStore 統合）→ 181f〜（命令追加・Consumer 移行・旧ストア削除）。
- **Goal**: 旧 `ToolSlice` が持つ画面状態（ツール・選択・色・線幅・パネル開閉・ワークスペースモード・エクスポート待機）の型を単一定義へ一本化し、ワークスペース遷移・選択遷移を `set()` から切り離した純粋関数として追加する。`SessionStore` への統合は TASK-181eb で行う。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - `rg -n "export (type|interface) (SelectedObject|SelectedObjectKind|MarkerOptionTab|RightPanelTab|PanelState|WorkspaceMode)\b" src/features/tactical-unified/stores/tool-types.ts` ➔ 0 matches（型定義は `session-ui-state.ts` に一本化し、`tool-types.ts` は再 export のみ）
  - Deleted files: なし

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 遷移関数は入力を変更せず新しいパッチを返す純粋関数（React / Zustand / DOM 依存ゼロ）。
  2. 遷移ロジックは旧 `tool-slice.ts` の `transitionWorkspaceMode` / `selectObject` / `selectObjects` / `toggleSplitPreview` と完全に同一の結果を返す。
  3. `tool-types.ts` の `ToolSlice` 本体と、旧 `tool-slice.ts` ほか旧 import 経路は変更しない（旧ストアは Consumer 移行完了まで従来どおり動作する。これは段階的移行であり、旧側は 181l で全削除する）。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `src/features/tactical-unified/stores/tool-types.ts`（型の再 export 化。`right-panel.tsx` / `tool-slice.ts` 等の import は再 export 経由で解決されるため変更不要）

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: 型・純粋遷移関数・テストの追加
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/stores/session-ui-state.ts`
  - `[ADD]` `src/features/tactical-unified/stores/session-ui-transitions.ts`
  - `[MODIFY]` `src/features/tactical-unified/stores/tool-types.ts`
  - `[ADD]` `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`

#### Task 1.1: `[ADD]` `src/features/tactical-unified/stores/session-ui-state.ts`
```ts
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical/project';

export type { DrawingTool, ExportTarget };

export type WorkspaceMode = 'board' | 'director';

export type SelectedObjectKind =
  | 'player'
  | 'arrow'
  | 'zone'
  | 'text'
  | 'ball'
  | 'vision-cone'
  | 'connect-line'
  | 'badge'
  | 'focus';

export type MarkerOptionTab =
  | 'vision'
  | 'connect'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'badge'
  | 'focus'
  | 'basic';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  /** 親選手ID (ネストアノテーションの場合) */
  parentPlayerId?: string;
}

export type RightPanelTab =
  | 'formation'
  | 'squad'
  | 'pitch'
  | 'camera'
  | 'screen';

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  splitPreviewOpen?: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}

export type TeamVisibility = 'both' | 'home' | 'away';
export type MarkerMode = '2d-only' | '3d-only' | 'all';

export interface SavedPanelState {
  sidebarOpen: boolean;
  isRightPanelOpen: boolean;
}

/** 更新頻度が高く永続化しない画面状態（SessionStore が保持する Hot State）。 */
export interface SessionUiState {
  readonly activeTool: DrawingTool;
  readonly continuousDrawing: boolean;
  readonly selectedObjects: readonly SelectedObject[];
  readonly connectingPlayerId: string | null;
  readonly activeMarkerOptionTab: MarkerOptionTab | null;
  readonly isDragging: boolean;
  readonly isHudOpen: boolean;
  readonly color: string;
  readonly strokeWidth: number;
  readonly fontSize: number;
  readonly customColor: string;
  readonly markerMode: MarkerMode;
  readonly teamVisibility: TeamVisibility;
  readonly panels: PanelState;
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
  activeTool: 'select',
  continuousDrawing: false,
  selectedObjects: [],
  connectingPlayerId: null,
  activeMarkerOptionTab: null,
  isDragging: false,
  isHudOpen: true,
  color: '#ffffff',
  strokeWidth: 2,
  fontSize: 14,
  customColor: '#ffffff',
  markerMode: 'all',
  teamVisibility: 'both',
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
};
```

#### Task 1.2: `[ADD]` `src/features/tactical-unified/stores/session-ui-transitions.ts`
```ts
import type {
  PanelState,
  SelectedObject,
  SessionUiState,
  WorkspaceMode,
} from './session-ui-state';

export const CLEARED_SELECTION: Pick<
  SessionUiState,
  'selectedObjects' | 'activeMarkerOptionTab'
> = {
  selectedObjects: [],
  activeMarkerOptionTab: null,
};

export function transitionWorkspaceMode(
  s: Pick<
    SessionUiState,
    'workspaceMode' | 'panels' | 'savedPanelStateBeforeDirector'
  >,
  targetMode: WorkspaceMode,
): Partial<SessionUiState> {
  if (targetMode === 'director') {
    return {
      workspaceMode: 'director',
      savedPanelStateBeforeDirector: {
        sidebarOpen: s.panels.sidebarOpen,
        isRightPanelOpen: s.panels.isRightPanelOpen,
      },
      panels: {
        ...s.panels,
        sidebarOpen: false,
        rightPanelTab: 'camera',
        isRightPanelOpen: true,
      },
    };
  }
  const restored = s.savedPanelStateBeforeDirector;
  return {
    workspaceMode: 'board',
    savedPanelStateBeforeDirector: null,
    panels: {
      ...s.panels,
      rightPanelTab: 'formation',
      ...(restored
        ? {
            sidebarOpen: restored.sidebarOpen,
            isRightPanelOpen: restored.isRightPanelOpen,
          }
        : {}),
    },
  };
}

export function selectObjectTransition(
  s: Pick<SessionUiState, 'selectedObjects'>,
  obj: SelectedObject | null,
  multi: boolean,
): Partial<SessionUiState> {
  if (!obj) return { ...CLEARED_SELECTION };
  if (multi) {
    const already = s.selectedObjects.some((o) => o.id === obj.id);
    return {
      selectedObjects: already
        ? s.selectedObjects.filter((o) => o.id !== obj.id)
        : [...s.selectedObjects, obj],
      isHudOpen: true,
    };
  }
  return { selectedObjects: [obj], isHudOpen: true };
}

export function selectObjectsTransition(
  s: Pick<SessionUiState, 'selectedObjects'>,
  objects: readonly SelectedObject[],
  multi: boolean,
): Partial<SessionUiState> {
  if (objects.length === 0 && !multi) return { ...CLEARED_SELECTION };
  if (multi) {
    const existingIds = new Set(s.selectedObjects.map((o) => o.id));
    const newItems = objects.filter((o) => !existingIds.has(o.id));
    return { selectedObjects: [...s.selectedObjects, ...newItems] };
  }
  const single = objects.length === 1 ? objects[0] : undefined;
  return {
    selectedObjects: objects,
    activeMarkerOptionTab: single?.kind === 'player' ? 'vision' : null,
    ...(single ? { isHudOpen: true } : {}),
  };
}

export function splitPreviewTransition(
  panels: PanelState,
  open: boolean,
): Partial<SessionUiState> {
  return {
    panels: {
      ...panels,
      splitPreviewOpen: open,
      ...(open ? { isRightPanelOpen: false } : {}),
    },
  };
}
```

#### Task 1.3: `[MODIFY]` `src/features/tactical-unified/stores/tool-types.ts` (L1-L50)
- 型定義を `session-ui-state.ts` へ一本化し、`tool-types.ts` は再 export のみにする（`ToolSlice` 本体は変更しない）。
- **Before**:
```ts
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical-unified';
import type { DrawingPreviewState } from '../core/types';

export type { DrawingTool, ExportTarget };

export type WorkspaceMode = 'board' | 'director';

export type SelectedObjectKind =
  | 'player'
  | 'arrow'
  | 'zone'
  | 'text'
  | 'ball'
  | 'vision-cone'
  | 'connect-line'
  | 'badge'
  | 'focus';

export type MarkerOptionTab =
  | 'vision'
  | 'connect'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'badge'
  | 'focus'
  | 'basic';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  /** 親選手ID (ネストアノテーションの場合) */
  parentPlayerId?: string;
}

export type RightPanelTab =
  | 'formation'
  | 'squad'
  | 'pitch'
  | 'camera'
  | 'screen';

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: RightPanelTab;
  isRightPanelOpen: boolean;
  splitPreviewOpen?: boolean;
  exportModalOpen: boolean;
  projectManagerModalOpen: boolean;
}
```
- **After**:
```ts
import type { DrawingPreviewState } from '../core/types';
import type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  RightPanelTab,
  SelectedObject,
  SelectedObjectKind,
  WorkspaceMode,
} from './session-ui-state';

export type {
  DrawingTool,
  ExportTarget,
  MarkerOptionTab,
  PanelState,
  RightPanelTab,
  SelectedObject,
  SelectedObjectKind,
  WorkspaceMode,
};
```

#### Task 1.4: `[ADD]` `src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts`
- **Concrete Test Implementation (モックなし・純粋関数 I/O)**:
```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SESSION_UI_STATE,
  type SelectedObject,
} from '../session-ui-state';
import {
  CLEARED_SELECTION,
  selectObjectsTransition,
  selectObjectTransition,
  splitPreviewTransition,
  transitionWorkspaceMode,
} from '../session-ui-transitions';

const player: SelectedObject = { id: 'p1', kind: 'player' };
const arrow: SelectedObject = { id: 'a1', kind: 'arrow' };

describe('transitionWorkspaceMode', () => {
  it('director 遷移でパネル状態を退避し、サイドバーを閉じてカメラタブで右パネルを開く', () => {
    const state = {
      ...DEFAULT_SESSION_UI_STATE,
      panels: { ...DEFAULT_SESSION_UI_STATE.panels, sidebarOpen: true },
    };
    const patch = transitionWorkspaceMode(state, 'director');
    expect(patch.workspaceMode).toBe('director');
    expect(patch.savedPanelStateBeforeDirector).toEqual({
      sidebarOpen: true,
      isRightPanelOpen: false,
    });
    expect(patch.panels?.sidebarOpen).toBe(false);
    expect(patch.panels?.rightPanelTab).toBe('camera');
    expect(patch.panels?.isRightPanelOpen).toBe(true);
  });

  it('board 復帰で退避済みパネル状態を復元し、フォーメーションタブへ戻す', () => {
    const state = {
      ...DEFAULT_SESSION_UI_STATE,
      workspaceMode: 'director' as const,
      savedPanelStateBeforeDirector: {
        sidebarOpen: true,
        isRightPanelOpen: false,
      },
    };
    const patch = transitionWorkspaceMode(state, 'board');
    expect(patch.workspaceMode).toBe('board');
    expect(patch.savedPanelStateBeforeDirector).toBeNull();
    expect(patch.panels?.sidebarOpen).toBe(true);
    expect(patch.panels?.isRightPanelOpen).toBe(false);
    expect(patch.panels?.rightPanelTab).toBe('formation');
  });

  it('退避状態が無い board 復帰ではパネル開閉を変えずタブのみ戻す', () => {
    const patch = transitionWorkspaceMode(DEFAULT_SESSION_UI_STATE, 'board');
    expect(patch.panels?.sidebarOpen).toBe(false);
    expect(patch.panels?.rightPanelTab).toBe('formation');
  });
});

describe('selectObjectTransition', () => {
  it('null でマーカーオプションタブごと選択を解除する', () => {
    const patch = selectObjectTransition({ selectedObjects: [player] }, null, false);
    expect(patch).toEqual(CLEARED_SELECTION);
  });

  it('単一選択は対象のみを選択し HUD を開く', () => {
    const patch = selectObjectTransition({ selectedObjects: [player] }, arrow, false);
    expect(patch).toEqual({ selectedObjects: [arrow], isHudOpen: true });
  });

  it('複数選択モードでは未選択なら追加し、選択済みなら除外する', () => {
    const added = selectObjectTransition({ selectedObjects: [player] }, arrow, true);
    expect(added.selectedObjects).toEqual([player, arrow]);
    const removed = selectObjectTransition(
      { selectedObjects: [player, arrow] },
      player,
      true,
    );
    expect(removed.selectedObjects).toEqual([arrow]);
  });
});

describe('selectObjectsTransition', () => {
  it('空配列の単一選択は選択を解除する', () => {
    const patch = selectObjectsTransition({ selectedObjects: [player] }, [], false);
    expect(patch).toEqual(CLEARED_SELECTION);
  });

  it('選手1件の単一選択は視野角タブを開き HUD を開く', () => {
    const patch = selectObjectsTransition({ selectedObjects: [] }, [player], false);
    expect(patch.selectedObjects).toEqual([player]);
    expect(patch.activeMarkerOptionTab).toBe('vision');
    expect(patch.isHudOpen).toBe(true);
  });

  it('矢印1件の単一選択はマーカーオプションタブを null にする', () => {
    const patch = selectObjectsTransition({ selectedObjects: [] }, [arrow], false);
    expect(patch.activeMarkerOptionTab).toBeNull();
  });

  it('複数選択モードでは既存と重複しないものだけを追加する', () => {
    const patch = selectObjectsTransition(
      { selectedObjects: [player] },
      [player, arrow],
      true,
    );
    expect(patch.selectedObjects).toEqual([player, arrow]);
  });
});

describe('splitPreviewTransition', () => {
  it('開くと右パネルを閉じ、閉じると右パネル状態を変更しない', () => {
    const panels = { ...DEFAULT_SESSION_UI_STATE.panels, isRightPanelOpen: true };
    const opened = splitPreviewTransition(panels, true);
    expect(opened.panels?.splitPreviewOpen).toBe(true);
    expect(opened.panels?.isRightPanelOpen).toBe(false);
    const closed = splitPreviewTransition(panels, false);
    expect(closed.panels?.splitPreviewOpen).toBe(false);
    expect(closed.panels?.isRightPanelOpen).toBe(true);
  });
});
```

- **Phase Verification**:
  - [x] 1. 4ファイルの追加・変更完了
  - [x] 2. `bun run ai:check src/features/tactical-unified/stores/session-ui-state.ts src/features/tactical-unified/stores/session-ui-transitions.ts src/features/tactical-unified/stores/tool-types.ts src/features/tactical-unified/stores/__tests__/session-ui-transitions.test.ts` が PASS すること
- **Worker Handoff Log**:
```
Phase 1 完了: session-ui-state.ts / session-ui-transitions.ts / tool-types.ts / session-ui-transitions.test.ts の実装と ai:check (11 tests PASS) を確認。
```
