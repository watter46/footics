import { act, fireEvent, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    (document.activeElement as HTMLElement)?.blur();
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    store.setIsPlaying(false);
    store.clearSelection();
  });

  it('Ctrl+C / Cmd+C で選択中オブジェクトがコピーされ、Ctrl+V / Cmd+V でペーストされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    // 1. Ctrl+C (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().clipboard).not.toBeNull();
    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    // 2. Ctrl+V (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const selectedObjects = useTacticalUnifiedStore.getState().selectedObjects;

    expect(selectedObjects).toHaveLength(1);
    expect(selectedObjects[0]?.id).not.toBe(player.id);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(53);
    expect(pastedPlayer?.y).toBeCloseTo(53);
  });

  it('Cmd+C / Cmd+V (macOS metaKey) でも正常にコピー＆ペーストされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('away', 30, 40, '#dc2626');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        metaKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const selectedObjects = useTacticalUnifiedStore.getState().selectedObjects;
    expect(selectedObjects).toHaveLength(1);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(33);
    expect(pastedPlayer?.y).toBeCloseTo(43);
  });

  it('INPUT / TEXTAREA / isContentEditable にフォーカス中はショートカットが発火しない', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
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

    // input 上でのキーイベントのためクリップボードは null のまま
    expect(useTacticalUnifiedStore.getState().clipboard).toBeNull();
    document.body.removeChild(inputElement);
  });

  it('Escape で選択が解除される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Escape',
        code: 'Escape',
      });
    });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  describe('段階的 Escape キー', () => {
    it('① input / textarea にフォーカス中は blur され、オブジェクト選択や右パネル開閉は変化しない', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      const player = createDefaultPlayer('home', 50, 50, '#034694');
      act(() => {
        store.setRightPanelOpen(true);
        store.addPlayer(player);
        store.selectObject({ id: player.id, kind: 'player' });
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

        // input が blur される
        expect(document.activeElement).not.toBe(inputElement);
        // オブジェクト選択は解除されない
        expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
          1,
        );
        // 右パネルも開いたまま
        expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
          true,
        );
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('② オブジェクト選択中は clearSelection のみ実行され、右パネルは閉じない', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      const player = createDefaultPlayer('home', 50, 50, '#034694');
      act(() => {
        store.setRightPanelOpen(true);
        store.addPlayer(player);
        store.selectObject({ id: player.id, kind: 'player' });
      });

      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        1,
      );
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      // オブジェクト選択は解除される
      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        0,
      );
      // 右パネルは開いたまま維持される
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );
    });

    it('③ オブジェクト非選択かつ右パネル展開中は右パネルが閉じられる', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      act(() => {
        store.clearSelection();
        store.setRightPanelOpen(true);
      });

      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        0,
      );
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      // 右パネルが閉じる
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        false,
      );
    });
  });

  describe('右パネル開閉ショートカット Mod+]', () => {
    it('Ctrl+] / Cmd+] で右パネルの開閉がトグルされる', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.setRightPanelOpen(true);
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      // 1. Ctrl+] で閉じる
      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          ctrlKey: true,
        });
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        false,
      );

      // 2. Cmd+] で開く
      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          metaKey: true,
        });
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );
    });
  });

  it('Delete / Backspace で選択中のオブジェクトが削除される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const initialCount =
      useTacticalUnifiedStore.getState().project.slides[0]?.players.length ?? 0;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    expect(
      useTacticalUnifiedStore.getState().project.slides[0]?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(activeSlide?.players).toHaveLength(initialCount);
    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  it('描画ツールショートカットは v (select) のみ動作し、他の文字キー (l, a, w, m) では切り替わらないこと', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      useTacticalUnifiedStore.getState().setActiveTool('line');
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'w', code: 'KeyW' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });

  describe('シーン操作ショートカット (d: 前へ, f: 次へ, r: 初めから再生)', () => {
    it('d キーで前のシーンに移動し、f キーで次のシーンに移動する', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      // スライドを3つ作成 (A, B, C)
      act(() => {
        store.addSlide(); // B
      });
      act(() => {
        store.addSlide(); // C
      });

      const slides = useTacticalUnifiedStore.getState().project.slides;
      expect(slides).toHaveLength(3);
      const [slideA, slideB, slideC] = slides;

      // 現在 B をアクティブにする
      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideB.id);
        useTacticalUnifiedStore.getState().setPlaybackIndices(1, null);
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);

      // 1. d キー押下 -> A (インデックス 0) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideA.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(0);

      // 先頭 (インデックス 0) でさらに d を押しても変化しない
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideA.id);

      // 2. f キー押下 -> B (インデックス 1) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(1);

      // f キー押下 -> C (インデックス 2) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(2);

      // 末尾でさらに f を押しても変化しない
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
    });

    it('r キーで先頭シーンに移動し、シーク時間0で再生を開始する', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide(); // B
      });
      act(() => {
        store.addSlide(); // C
      });

      const slides = useTacticalUnifiedStore.getState().project.slides;
      const [slideA, , slideC] = slides;

      // C をアクティブ、再生停止、シーク時間を 5000ms に設定
      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideC.id);
        useTacticalUnifiedStore.getState().setPlaybackIndices(2, null);
        useTacticalUnifiedStore.getState().seekTo(5000);
        useTacticalUnifiedStore.getState().setIsPlaying(false);
      });

      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

      // r キー押下 -> A へ移動し再生開始
      act(() => {
        fireEvent.keyDown(document, { key: 'r', code: 'KeyR' });
      });

      const updatedStore = useTacticalUnifiedStore.getState();
      expect(updatedStore.activeSlideId).toBe(slideA.id);
      expect(updatedStore.playbackSlideIndex).toBe(0);
      expect(updatedStore.playbackSeekTimeMs).toBe(0);
      expect(updatedStore.isPlaying).toBe(true);
    });

    it('input / textarea にフォーカス中は d, f, r が発火しないこと', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide();
      });
      const [slideA] = useTacticalUnifiedStore.getState().project.slides;

      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideA.id);
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        act(() => {
          fireEvent.keyDown(inputElement, { key: 'f', code: 'KeyF' });
        });
        // スライドは変化しない
        expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(
          slideA.id,
        );
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('Ctrl / Meta / Alt などの修飾キー付きではシーン操作 (d, f, r) が発火しないこと', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide();
      });
      const [, slideB] = useTacticalUnifiedStore.getState().project.slides;

      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideB.id);
      });

      // Ctrl+D (オブジェクト複製等) -> d によるシーン移動は発火しない
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);
    });
  });

  it('Ctrl+M / Cmd+M でアクティブシーンが複製され、ツール切替 (m) と競合しない', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const initialSlideId = store.activeSlideId;
    const initialSlidesCount = store.project.slides.length;

    // 1. Ctrl+M (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        ctrlKey: true,
      });
    });

    const slidesAfterCtrlM = useTacticalUnifiedStore.getState().project.slides;
    expect(slidesAfterCtrlM).toHaveLength(initialSlidesCount + 1);
    const newSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    expect(newSlideId).not.toBe(initialSlideId);
    // ツールが player に誤変更されていないこと (Ctrl 修飾キーガード)
    expect(useTacticalUnifiedStore.getState().activeTool).not.toBe('player');

    // 2. Cmd+M (macOS metaKey)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        metaKey: true,
      });
    });

    const slidesAfterCmdM = useTacticalUnifiedStore.getState().project.slides;
    expect(slidesAfterCmdM).toHaveLength(initialSlidesCount + 2);
  });

  it('Space キーで再生トグルが発火する', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });

  it('Ctrl+Z / Cmd+Z で Undo が実行され、Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y で Redo が実行される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialCount =
      store.project.slides.find((s) => s.id === slideId)?.players.length ?? 0;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
    });

    const slideAfterAdd = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterAdd?.players).toHaveLength(initialCount + 1);

    // 1. Ctrl+Z (Undo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    const slideAfterUndo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterUndo?.players).toHaveLength(initialCount);

    // 2. Ctrl+Shift+Z (Redo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });

    const slideAfterRedo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterRedo?.players).toHaveLength(initialCount + 1);

    // 3. Cmd+Z (macOS Undo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        metaKey: true,
      });
    });
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)?.players,
    ).toHaveLength(initialCount);

    // 4. Ctrl+Y (Windows Redo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
      });
    });
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)?.players,
    ).toHaveLength(initialCount + 1);
  });

  it('オブジェクト非選択時に Delete キーでアクティブスライドが削除され、Ctrl+Z で復元される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();

    // スライドを追加して2枚にする
    act(() => {
      store.addSlide();
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);
    const addedSlideId = useTacticalUnifiedStore.getState().activeSlideId;

    // オブジェクト非選択状態で Delete キーを押す
    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    // スライドが1枚に減る
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.some((s) => s.id === addedSlideId),
    ).toBe(false);

    // Ctrl+Z で削除前のスライドが完全復元される
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.some((s) => s.id === addedSlideId),
    ).toBe(true);
  });

  it('スライドが1枚のみのときに Delete キーを押しても削除されない（最低1枚制限）', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
  });

  it('TacticalUnifiedStoreContext から渡された独立ストアを正しく操作する', () => {
    const customStore = createTacticalUnifiedStore();
    customStore.getState().setActiveTool('line');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalUnifiedStoreContext.Provider,
        { value: customStore },
        children,
      );

    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });

    // customStore の activeTool が更新され、グローバルストアは影響を受けない
    expect(customStore.getState().activeTool).toBe('select');
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });

  it('Tab キーで WorkspaceMode (board <-> director) がトグルされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    expect(store.workspaceMode).toBe('board');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
  });
});
