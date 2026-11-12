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
    const patch = selectObjectTransition(
      { selectedObjects: [player] },
      null,
      false,
    );
    expect(patch).toEqual(CLEARED_SELECTION);
  });

  it('単一選択は対象のみを選択し HUD を開く', () => {
    const patch = selectObjectTransition(
      { selectedObjects: [player] },
      arrow,
      false,
    );
    expect(patch).toEqual({ selectedObjects: [arrow], isHudOpen: true });
  });

  it('複数選択モードでは未選択なら追加し、選択済みなら除外する', () => {
    const added = selectObjectTransition(
      { selectedObjects: [player] },
      arrow,
      true,
    );
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
    const patch = selectObjectsTransition(
      { selectedObjects: [player] },
      [],
      false,
    );
    expect(patch).toEqual(CLEARED_SELECTION);
  });

  it('選手1件の単一選択は視野角タブを開き HUD を開く', () => {
    const patch = selectObjectsTransition(
      { selectedObjects: [] },
      [player],
      false,
    );
    expect(patch.selectedObjects).toEqual([player]);
    expect(patch.activeMarkerOptionTab).toBe('vision');
    expect(patch.isHudOpen).toBe(true);
  });

  it('矢印1件の単一選択はマーカーオプションタブを null にする', () => {
    const patch = selectObjectsTransition(
      { selectedObjects: [] },
      [arrow],
      false,
    );
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
    const panels = {
      ...DEFAULT_SESSION_UI_STATE.panels,
      isRightPanelOpen: true,
    };
    const opened = splitPreviewTransition(panels, true);
    expect(opened.panels?.splitPreviewOpen).toBe(true);
    expect(opened.panels?.isRightPanelOpen).toBe(false);
    const closed = splitPreviewTransition(panels, false);
    expect(closed.panels?.splitPreviewOpen).toBe(false);
    expect(closed.panels?.isRightPanelOpen).toBe(true);
  });
});
