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

  it('ツールショートカットキー (v, l, r, a, d, w, z, p, t, m, o, e) でアクティブツールが切り替わる', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('arrow_solid');

    act(() => {
      fireEvent.keyDown(document, { key: 'w', code: 'KeyW' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('arrow_wavy');

    act(() => {
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('player');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
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
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalUnifiedStoreContext.Provider,
        { value: customStore },
        children,
      );

    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      fireEvent.keyDown(document, { key: 'l', code: 'KeyL' });
    });

    // customStore の activeTool が更新され、グローバルストアは影響を受けない
    expect(customStore.getState().activeTool).toBe('line');
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });
});
