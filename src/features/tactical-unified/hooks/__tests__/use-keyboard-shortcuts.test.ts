import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    expect(useTacticalUnifiedStore.getState().clipboard).not.toBeNull();
    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    // 2. Ctrl+V (Windows/Linux)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'v',
          ctrlKey: true,
          bubbles: true,
        }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          metaKey: true,
          bubbles: true,
        }),
      );
    });

    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'v',
          metaKey: true,
          bubbles: true,
        }),
      );
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

    act(() => {
      inputElement.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'c',
          ctrlKey: true,
          bubbles: true,
        }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
        }),
      );
    });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        }),
      );
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(activeSlide?.players).toHaveLength(initialCount);
    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  it('ツールショートカットキー (v, l, r, a, d, z, p, t, e) でアクティブツールが切り替わる', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'l', bubbles: true }),
      );
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
      );
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('arrow_solid');

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'v', bubbles: true }),
      );
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });

  it('Space キーで再生トグルが発火する', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
      );
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: 'Space', bubbles: true }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
        }),
      );
    });

    const slideAfterUndo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterUndo?.players).toHaveLength(initialCount);

    // 2. Ctrl+Shift+Z (Redo)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
    });

    const slideAfterRedo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterRedo?.players).toHaveLength(initialCount + 1);

    // 3. Cmd+Z (macOS Undo)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          metaKey: true,
          bubbles: true,
        }),
      );
    });
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)?.players,
    ).toHaveLength(initialCount);

    // 4. Ctrl+Y (Windows Redo)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'y',
          ctrlKey: true,
          bubbles: true,
        }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'z',
          ctrlKey: true,
          bubbles: true,
        }),
      );
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
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Delete',
          bubbles: true,
        }),
      );
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
  });
});
