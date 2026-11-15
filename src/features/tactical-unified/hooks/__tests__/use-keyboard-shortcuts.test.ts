import { act, fireEvent, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import {
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';

function createTestPlayer(
  team: 'home' | 'away',
  x: number,
  y: number,
  color: string,
): DomainPlayer {
  return {
    id: crypto.randomUUID(),
    team,
    area: 'pitch',
    shirtNo: '10',
    position: 'MF',
    x: clampToScreenNorm(x),
    y: clampToScreenNorm(y),
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
    },
    connectLines: [],
    badges: [],
  };
}

function createKeyboardHarness() {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return {
    documentStore,
    sessionStore,
    playbackStore,
    phaseId,
    slideId,
    wrapper,
  };
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    (document.activeElement as HTMLElement)?.blur();
  });

  it('Ctrl+C / Cmd+C で選択中オブジェクトがコピーされ、Ctrl+V / Cmd+V でペーストされる', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(sessionStore.getState().clipboard).not.toBeNull();
    expect(sessionStore.getState().clipboard?.players).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    const selectedObjects = sessionStore.getState().selectedObjects;

    expect(selectedObjects).toHaveLength(1);
    expect(selectedObjects[0]?.id).not.toBe(player.id);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(53);
    expect(pastedPlayer?.y).toBeCloseTo(53);
  });

  it('Cmd+C / Cmd+V (macOS metaKey) でも正常にコピー＆ペーストされる', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('away', 30, 40, '#dc2626');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        metaKey: true,
      });
    });

    expect(sessionStore.getState().clipboard?.players).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    const selectedObjects = sessionStore.getState().selectedObjects;
    expect(selectedObjects).toHaveLength(1);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(33);
    expect(pastedPlayer?.y).toBeCloseTo(43);
  });

  it('INPUT / TEXTAREA / isContentEditable にフォーカス中はショートカットが発火しない', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    const inputElement = document.createElement('input');
    document.body.appendChild(inputElement);
    inputElement.focus();

    act(() => {
      fireEvent.keyDown(inputElement, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(sessionStore.getState().clipboard).toBeNull();
    document.body.removeChild(inputElement);
  });

  it('Escape で選択が解除される', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    expect(sessionStore.getState().selectedObjects).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Escape',
        code: 'Escape',
      });
    });

    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
  });

  describe('段階的 Escape キー', () => {
    it('① input / textarea にフォーカス中は blur され、オブジェクト選択や右パネル開閉は変化しない', () => {
      const { documentStore, sessionStore, phaseId, slideId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const player = createTestPlayer('home', 50, 50, '#034694');
      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'INSERT_ENTITIES',
          players: [player],
        });
        sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        expect(document.activeElement).toBe(inputElement);

        act(() => {
          fireEvent.keyDown(inputElement, {
            key: 'Escape',
            code: 'Escape',
          });
        });

        expect(document.activeElement).not.toBe(inputElement);
        expect(sessionStore.getState().selectedObjects).toHaveLength(1);
        expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('② オブジェクト選択中は clearSelection のみ実行され、右パネルは閉じない', () => {
      const { documentStore, sessionStore, phaseId, slideId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const player = createTestPlayer('home', 50, 50, '#034694');
      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'INSERT_ENTITIES',
          players: [player],
        });
        sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(1);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(0);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
    });

    it('③ オブジェクト非選択かつ右パネル展開中は右パネルが閉じられる', () => {
      const { sessionStore, wrapper } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      act(() => {
        sessionStore.getState().clearSelection();
        sessionStore.getState().setRightPanelOpen(true);
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(0);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(false);
    });
  });

  describe('右パネル開閉ショートカット Mod+]', () => {
    it('Ctrl+] / Cmd+] で右パネルの開閉がトグルされる', () => {
      const { sessionStore, wrapper } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          ctrlKey: true,
        });
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(false);

      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          metaKey: true,
        });
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
    });
  });

  it('Delete / Backspace で選択中のオブジェクトが削除される', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const initialCount =
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.length ?? 0;

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.players).toHaveLength(initialCount);
    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
  });

  it('描画ツールショートカットは v (select) のみ動作し、他の文字キー (l, a, w, m) では切り替わらないこと', () => {
    const { sessionStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      sessionStore.getState().setActiveTool('line');
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'w', code: 'KeyW' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(sessionStore.getState().activeTool).toBe('select');
  });

  describe('シーン操作ショートカット (d: 前へ, f: 次へ, r: 初めから再生)', () => {
    it('d キーで前のシーンに移動し、f キーで次のシーンに移動する', () => {
      const { documentStore, sessionStore, playbackStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });

      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );
      expect(slides).toHaveLength(3);
      const [slideA, slideB, slideC] = slides;

      act(() => {
        sessionStore.getState().setActiveSlideId(slideB.id);
        playbackStore.getState().setPlaybackIndices(1, null);
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(0);

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(1);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(2);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
    });

    it('r キーで先頭シーンに移動し、シーク時間0で再生を開始する', () => {
      const { documentStore, sessionStore, playbackStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });

      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );
      const [slideA, , slideC] = slides;

      act(() => {
        sessionStore.getState().setActiveSlideId(slideC.id);
        playbackStore.getState().setPlaybackIndices(2, null);
        playbackStore.getState().seekTo(5000);
        playbackStore.getState().pausePlayback();
      });

      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
      expect(playbackStore.getState().isPlaying).toBe(false);

      act(() => {
        fireEvent.keyDown(document, { key: 'r', code: 'KeyR' });
      });

      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(0);
      expect(Number(playbackStore.getState().timeMs)).toBe(0);
      expect(playbackStore.getState().isPlaying).toBe(true);
    });

    it('input / textarea にフォーカス中は d, f, r が発火しないこと', () => {
      const { documentStore, sessionStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });
      const [slideA] = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );

      act(() => {
        sessionStore.getState().setActiveSlideId(slideA.id);
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        act(() => {
          fireEvent.keyDown(inputElement, { key: 'f', code: 'KeyF' });
        });
        expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('Ctrl / Meta / Alt などの修飾キー付きではシーン操作 (d, f, r) が発火しないこと', () => {
      const { documentStore, sessionStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });
      const [, slideB] = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );

      act(() => {
        sessionStore.getState().setActiveSlideId(slideB.id);
      });

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);
    });
  });

  it('Ctrl+M / Cmd+M でアクティブシーンが複製され、ツール切替 (m) と競合しない', () => {
    const {
      documentStore,
      sessionStore,
      phaseId,
      slideId: initialSlideId,
      wrapper,
    } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const initialSlidesCount = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    ).length;

    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        ctrlKey: true,
      });
    });

    const slidesAfterCtrlM = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    );
    expect(slidesAfterCtrlM).toHaveLength(initialSlidesCount + 1);
    const newSlideId = sessionStore.getState().activeSlideId;
    expect(newSlideId).not.toBe(initialSlideId);
    expect(sessionStore.getState().activeTool).not.toBe('player');

    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        metaKey: true,
      });
    });

    const slidesAfterCmdM = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    );
    expect(slidesAfterCmdM).toHaveLength(initialSlidesCount + 2);
  });

  it('Space キーで再生トグルが発火する', () => {
    const { playbackStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(playbackStore.getState().isPlaying).toBe(false);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(playbackStore.getState().isPlaying).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(playbackStore.getState().isPlaying).toBe(false);
  });

  it('Ctrl+Z / Cmd+Z で Undo が実行され、Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y で Redo が実行される', () => {
    const { documentStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const initialCount =
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.length ?? 0;

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        metaKey: true,
      });
    });
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
      });
    });
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);
  });

  it('オブジェクト非選択時に Delete キーでアクティブスライドが削除され、Ctrl+Z で復元される', () => {
    const { documentStore, sessionStore, phaseId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const addedSlideId = crypto.randomUUID();
    act(() => {
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        newSlideId: addedSlideId,
      });
      sessionStore.getState().setActiveSlideId(addedSlideId);
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(2);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);
    expect(
      selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      ).some((s) => s.id === addedSlideId),
    ).toBe(false);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(2);
    expect(
      selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      ).some((s) => s.id === addedSlideId),
    ).toBe(true);
  });

  it('スライドが1枚のみのときに Delete キーを押しても削除されない（最低1枚制限）', () => {
    const { documentStore, phaseId, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);
  });

  it('TacticalStoreProvider から渡された独立ストアを正しく操作する', () => {
    const harnessA = createKeyboardHarness();
    const harnessB = createKeyboardHarness();
    harnessA.sessionStore.getState().setActiveTool('line');
    harnessB.sessionStore.getState().setActiveTool('zone');

    renderHook(() => useKeyboardShortcuts(), { wrapper: harnessA.wrapper });

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });

    expect(harnessA.sessionStore.getState().activeTool).toBe('select');
    expect(harnessB.sessionStore.getState().activeTool).toBe('zone');
  });

  it('Tab キーで WorkspaceMode (board <-> director) がトグルされる', () => {
    const { sessionStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(sessionStore.getState().workspaceMode).toBe('board');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(sessionStore.getState().workspaceMode).toBe('director');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(sessionStore.getState().workspaceMode).toBe('board');
  });
});
