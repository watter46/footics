import { act, renderHook } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  clampToScreenNorm,
  toMilliseconds,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type {
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { createDocumentStore, type DocumentStore } from '../document-store';
import { createPlaybackStore, type PlaybackStore } from '../playback-store';
import { createSessionStore, type SessionStore } from '../session-store';
import {
  TacticalStoreProvider,
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '../tactical-store-provider';

function createDummyProject(): DomainTacticalProject {
  const dummyPhase: DomainTacticalPhase = {
    id: 'phase-1',
    name: 'Phase 1',
    aspectRatio: '4:5',
    boundaryBox: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    },
    backgroundType: 'pitch',
    slides: [
      {
        id: 'slide-1',
        index: 0,
        label: 'Scene 1',
        players: [
          {
            id: 'player-1',
            shirtNo: '10',
            name: 'Messi',
            position: 'FW',
            area: 'pitch',
            team: 'home',
            x: clampToScreenNorm(50),
            y: clampToScreenNorm(50),
            style: {
              markerType: 'circle',
              insideContent: 'number',
              bottomLabel: 'name',
              color: '#034694',
              strokeColor: '#ffffff',
              strokeWidth: 2,
              sizeScale: 1.0,
              numberSizeScale: 1.0,
              labelSizeScale: 1.0,
            },
            connectLines: [],
            badges: [],
          },
        ],
        arrows: [],
        zones: [],
        texts: [],
        ball: {
          x: clampToScreenNorm(50),
          y: clampToScreenNorm(50),
          visible: true,
        },
        transitionDurationMs: 1000,
        pauseMs: 500,
        easing: 'ease-in-out',
      },
    ],
  };

  return {
    id: 'proj-1',
    version: '3.0.0',
    title: 'Initial Project',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: {
      pitchBackgroundType: 'solid',
      overlayColor: '#0B303E',
      overlayOpacity: 1.0,
      lineColor: '#ffffff',
      lineWidth: 2.5,
      lineOpacity: 1.0,
    },
    screenBackground: { type: 'cinematic' },
    phases: [dummyPhase],
    tags: [],
  };
}

describe('3-Frequency Independent Stores (Cold / Hot / Stream)', () => {
  describe('Cold Store (DocumentStore)', () => {
    it('初期状態が正しく設定され、dispatch で past が蓄積され undo/redo が機能すること', () => {
      const initialProject = createDummyProject();
      const store = createDocumentStore(initialProject);

      expect(store.getState().project.title).toBe('Initial Project');
      expect(store.getState().past).toHaveLength(0);
      expect(store.getState().future).toHaveLength(0);
      expect(store.getState().isDirty).toBe(false);
      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(false);

      // dispatch command
      store.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Updated Title' },
      });

      expect(store.getState().project.title).toBe('Updated Title');
      expect(store.getState().past).toHaveLength(1);
      expect(store.getState().past[0]?.title).toBe('Initial Project');
      expect(store.getState().future).toHaveLength(0);
      expect(store.getState().isDirty).toBe(true);
      expect(store.getState().canUndo()).toBe(true);
      expect(store.getState().canRedo()).toBe(false);

      // undo
      store.getState().undo();
      expect(store.getState().project.title).toBe('Initial Project');
      expect(store.getState().past).toHaveLength(0);
      expect(store.getState().future).toHaveLength(1);
      expect(store.getState().future[0]?.title).toBe('Updated Title');
      expect(store.getState().canUndo()).toBe(false);
      expect(store.getState().canRedo()).toBe(true);

      // redo
      store.getState().redo();
      expect(store.getState().project.title).toBe('Updated Title');
      expect(store.getState().past).toHaveLength(1);
      expect(store.getState().future).toHaveLength(0);
      expect(store.getState().canUndo()).toBe(true);
      expect(store.getState().canRedo()).toBe(false);
    });

    it('dispatchSlide が内部で APPLY_SLIDE_COMMAND をディスパッチすること', () => {
      const initialProject = createDummyProject();
      const store = createDocumentStore(initialProject);

      store.getState().dispatchSlide('phase-1', 'slide-1', {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: 'player-1',
            x: toScreenNormCoord(60),
            y: toScreenNormCoord(70),
          },
        ],
      });

      const updatedPlayer = store
        .getState()
        .project.phases[0]?.slides[0]?.players.find((p) => p.id === 'player-1');
      expect(updatedPlayer?.x).toBe(60);
      expect(updatedPlayer?.y).toBe(70);
      expect(store.getState().past).toHaveLength(1);
    });

    it('past の履歴スタック上限（50件）を超えた場合、古い履歴から捨てられること', () => {
      const initialProject = createDummyProject();
      const store = createDocumentStore(initialProject);

      for (let i = 0; i < 60; i++) {
        store.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: `Title ${i}` },
        });
      }

      expect(store.getState().past).toHaveLength(50);
      expect(store.getState().project.title).toBe('Title 59');
      // past[0] should be Title 9 (since 60 items were added, 0..59, current is 59, past has 9..58)
      expect(store.getState().past[0]?.title).toBe('Title 9');
    });

    it('変更がないコマンドでは past は蓄積されず isDirty も更新されないこと', () => {
      const initialProject = createDummyProject();
      const store = createDocumentStore(initialProject);

      // 無効なslideIdへのコマンド
      store.getState().dispatchSlide('phase-1', 'non-existent-slide', {
        type: 'MOVE_PLAYERS',
        moves: [],
      });

      expect(store.getState().past).toHaveLength(0);
      expect(store.getState().isDirty).toBe(false);
    });

    it('loadProject で履歴がリセットされ isDirty が false になること', () => {
      const store = createDocumentStore(createDummyProject());
      store.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Dirty Title' },
      });
      expect(store.getState().isDirty).toBe(true);

      const fresh = {
        ...createDummyProject(),
        title: 'Loaded Project',
      };
      store.getState().loadProject(fresh);

      expect(store.getState().project.title).toBe('Loaded Project');
      expect(store.getState().past).toHaveLength(0);
      expect(store.getState().future).toHaveLength(0);
      expect(store.getState().isDirty).toBe(false);
    });
  });

  describe('Hot Store (SessionStore)', () => {
    it('ドラッグデルタや選択状態を高速に更新できること', () => {
      const sessionStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });

      expect(sessionStore.getState().activePhaseId).toBe('phase-1');
      expect(sessionStore.getState().activeSlideId).toBe('slide-1');
      expect(sessionStore.getState().selectedObjects).toEqual([]);
      expect(sessionStore.getState().activeDragDelta).toBeNull();

      sessionStore.getState().setActiveDragDelta({
        entityIds: ['player-1'],
        deltaScreenNormX: 5,
        deltaScreenNormY: 10,
      });

      expect(sessionStore.getState().activeDragDelta).toEqual({
        entityIds: ['player-1'],
        deltaScreenNormX: 5,
        deltaScreenNormY: 10,
      });

      sessionStore.getState().selectObjects([
        { id: 'player-1', kind: 'player' },
        { id: 'arrow-1', kind: 'arrow' },
      ]);
      expect(sessionStore.getState().selectedObjects.map((o) => o.id)).toEqual([
        'player-1',
        'arrow-1',
      ]);

      sessionStore.getState().setActiveTool('select');
      expect(sessionStore.getState().activeTool).toBe('select');
    });
  });

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
      expect(sessionStore.getState().selectedObjects.map((o) => o.id)).toEqual([
        'p1',
        'a1',
      ]);

      sessionStore.getState().selectObject({ id: 'p1', kind: 'player' }, true);
      expect(sessionStore.getState().selectedObjects.map((o) => o.id)).toEqual([
        'a1',
      ]);

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

  describe('Stream Store (PlaybackStore)', () => {
    it('再生・一時停止・停止・シークが正しく状態遷移すること', () => {
      const playbackStore = createPlaybackStore();

      expect(playbackStore.getState().isPlaying).toBe(false);
      expect(playbackStore.getState().timeMs).toBe(0);

      playbackStore.getState().startPlayback();
      expect(playbackStore.getState().isPlaying).toBe(true);

      playbackStore.getState().setTimeMs(toMilliseconds(750));
      expect(playbackStore.getState().timeMs).toBe(750);

      playbackStore.getState().pausePlayback();
      expect(playbackStore.getState().isPlaying).toBe(false);
      expect(playbackStore.getState().timeMs).toBe(750);

      playbackStore.getState().seekTo(toMilliseconds(1200));
      expect(playbackStore.getState().timeMs).toBe(1200);

      playbackStore.getState().stopPlayback();
      expect(playbackStore.getState().isPlaying).toBe(false);
      expect(playbackStore.getState().timeMs).toBe(0);
    });
  });

  describe('3頻度の独立性 & 購読遮断の検証 (CRITICAL INVARIANT)', () => {
    it('sessionStore.setActiveDragDelta を100回呼んでも documentStore の past.length は 0 かつ isDirty === false のままであること', () => {
      const documentStore = createDocumentStore(createDummyProject());
      const sessionStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });

      for (let i = 0; i < 100; i++) {
        sessionStore.getState().setActiveDragDelta({
          entityIds: ['player-1'],
          deltaScreenNormX: i,
          deltaScreenNormY: i,
        });
      }

      expect(documentStore.getState().past.length).toBe(0);
      expect(documentStore.getState().isDirty).toBe(false);
    });

    it('sessionStore や playbackStore の高頻度更新時に documentStore のリスナーが一切発火しないこと', () => {
      const documentStore = createDocumentStore(createDummyProject());
      const sessionStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });
      const playbackStore = createPlaybackStore();

      const docListener = vi.fn();
      const sessionListener = vi.fn();
      const playbackListener = vi.fn();

      documentStore.subscribe(docListener);
      sessionStore.subscribe(sessionListener);
      playbackStore.subscribe(playbackListener);

      // 1. Hot State更新 (60fps drag想定)
      for (let i = 0; i < 60; i++) {
        sessionStore.getState().setActiveDragDelta({
          entityIds: ['player-1'],
          deltaScreenNormX: i,
          deltaScreenNormY: i,
        });
      }

      expect(sessionListener).toHaveBeenCalledTimes(60);
      expect(docListener).not.toHaveBeenCalled();
      expect(playbackListener).not.toHaveBeenCalled();

      // 2. Stream State更新 (60fps animation想定)
      for (let i = 0; i < 60; i++) {
        playbackStore.getState().setTimeMs(toMilliseconds(i * 16));
      }

      expect(playbackListener).toHaveBeenCalledTimes(60);
      expect(docListener).not.toHaveBeenCalled();

      // 3. Cold State更新 (ドラッグ完了時の dispatch)
      documentStore.getState().dispatch({
        type: 'UPDATE_PROJECT_META',
        patch: { title: 'Committed' },
      });

      expect(docListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('TacticalStoreProvider and context hooks', () => {
    it('Provider 経由で各ストアの状態を独立して購読できること', () => {
      const initialProject = createDummyProject();
      const docStore = createDocumentStore(initialProject);
      const sessStore = createSessionStore({
        activePhaseId: 'phase-1',
        activeSlideId: 'slide-1',
      });
      const playStore = createPlaybackStore();

      const wrapper = ({ children }: { children: ReactNode }) =>
        React.createElement(
          TacticalStoreProvider,
          {
            stores: {
              documentStore: docStore,
              sessionStore: sessStore,
              playbackStore: playStore,
            },
          },
          children,
        );

      const { result } = renderHook(
        () => ({
          title: useDocumentStore((s) => s.project.title),
          activeTool: useSessionStore((s) => s.activeTool),
          isPlaying: usePlaybackStore((s) => s.isPlaying),
          context: useTacticalStoresContext(),
        }),
        { wrapper },
      );

      expect(result.current.title).toBe('Initial Project');
      expect(result.current.activeTool).toBe('select');
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.context.documentStore).toBe(docStore);

      // Session のみ更新
      act(() => {
        sessStore.getState().setActiveTool('pan');
      });
      expect(result.current.activeTool).toBe('pan');

      // Playback のみ更新
      act(() => {
        playStore.getState().startPlayback();
      });
      expect(result.current.isPlaying).toBe(true);

      // Document のみ更新
      act(() => {
        docStore.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: 'Provider Updated' },
        });
      });
      expect(result.current.title).toBe('Provider Updated');
    });
  });
});
