import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('tactical-unified-store - workspace mode (Board <-> Director)', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    useTacticalUnifiedStore.setState({
      workspaceMode: 'board',
      savedPanelStateBeforeDirector: null,
      panels: {
        sidebarOpen: false,
        inspectorOpen: true,
        rightPanelTab: 'formation',
        isRightPanelOpen: false,
        splitPreviewOpen: false,
        exportModalOpen: false,
        projectManagerModalOpen: false,
      },
      isPlaying: false,
    });
  });

  describe('initial state', () => {
    it('初期モードは board であり、savedPanelStateBeforeDirector は null である', () => {
      const state = useTacticalUnifiedStore.getState();
      expect(state.workspaceMode).toBe('board');
      expect(state.savedPanelStateBeforeDirector).toBeNull();
    });
  });

  describe('toggleWorkspaceMode', () => {
    it('board から director へ切り替えるとパネルが折りたたまれ、状態が保存される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSidebarOpen(true);
      store.setRightPanelOpen(true);

      expect(useTacticalUnifiedStore.getState().panels.sidebarOpen).toBe(true);
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      store.toggleWorkspaceMode();

      const directorState = useTacticalUnifiedStore.getState();
      expect(directorState.workspaceMode).toBe('director');
      expect(directorState.panels.sidebarOpen).toBe(false);
      expect(directorState.panels.isRightPanelOpen).toBe(false);
      expect(directorState.savedPanelStateBeforeDirector).toEqual({
        sidebarOpen: true,
        isRightPanelOpen: true,
      });
    });

    it('director から board へ切り替えると保存されたパネル状態が復元され、savedPanelStateBeforeDirector は null になる', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSidebarOpen(true);
      store.setRightPanelOpen(false);

      store.toggleWorkspaceMode(); // -> director
      expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');
      expect(useTacticalUnifiedStore.getState().panels.sidebarOpen).toBe(false);

      store.toggleWorkspaceMode(); // -> board

      const boardState = useTacticalUnifiedStore.getState();
      expect(boardState.workspaceMode).toBe('board');
      expect(boardState.panels.sidebarOpen).toBe(true);
      expect(boardState.panels.isRightPanelOpen).toBe(false);
      expect(boardState.savedPanelStateBeforeDirector).toBeNull();
    });
  });

  describe('setWorkspaceMode', () => {
    it('setWorkspaceMode("director") でパネルが閉じられ、直前のパネル状態が保存される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSidebarOpen(false);
      store.setRightPanelOpen(true);

      store.setWorkspaceMode('director');

      const state = useTacticalUnifiedStore.getState();
      expect(state.workspaceMode).toBe('director');
      expect(state.panels.sidebarOpen).toBe(false);
      expect(state.panels.isRightPanelOpen).toBe(false);
      expect(state.savedPanelStateBeforeDirector).toEqual({
        sidebarOpen: false,
        isRightPanelOpen: true,
      });
    });

    it('既に director の場合に再度 setWorkspaceMode("director") を呼んでも savedPanelStateBeforeDirector は上書きされない', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSidebarOpen(true);
      store.setRightPanelOpen(true);

      store.setWorkspaceMode('director');
      expect(
        useTacticalUnifiedStore.getState().savedPanelStateBeforeDirector,
      ).toEqual({
        sidebarOpen: true,
        isRightPanelOpen: true,
      });

      store.setWorkspaceMode('director');
      expect(
        useTacticalUnifiedStore.getState().savedPanelStateBeforeDirector,
      ).toEqual({
        sidebarOpen: true,
        isRightPanelOpen: true,
      });
    });

    it('setWorkspaceMode("board") で元のパネル状態に復元される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setSidebarOpen(true);
      store.setRightPanelOpen(false);

      store.setWorkspaceMode('director');
      store.setWorkspaceMode('board');

      const state = useTacticalUnifiedStore.getState();
      expect(state.workspaceMode).toBe('board');
      expect(state.panels.sidebarOpen).toBe(true);
      expect(state.panels.isRightPanelOpen).toBe(false);
      expect(state.savedPanelStateBeforeDirector).toBeNull();
    });
  });

  describe('playback operation maintains workspaceMode', () => {
    it('board モードで togglePlayback しても workspaceMode は board のまま保持される', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.workspaceMode).toBe('board');

      store.togglePlayback();
      expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
    });

    it('director モードで togglePlayback しても workspaceMode は director のまま保持される', () => {
      const store = useTacticalUnifiedStore.getState();
      store.setWorkspaceMode('director');
      expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

      store.togglePlayback();
      expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');
    });
  });
});
