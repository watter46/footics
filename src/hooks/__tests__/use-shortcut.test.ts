import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useKeyboardShortcut } from '../use-shortcut';

describe('useKeyboardShortcut', () => {
  it('ショートカットキー押下時にコールバックが実行される', () => {
    const callback = vi.fn();
    renderHook(() =>
      useKeyboardShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, callback),
    );

    // TOGGLE_TACTICAL_BOARD は alt+b
    act(() => {
      fireEvent.keyDown(document, { key: 'b', code: 'KeyB', altKey: true });
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('enabled: false のときはコールバックが実行されない', () => {
    const callback = vi.fn();
    renderHook(() =>
      useKeyboardShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, callback, {
        enabled: false,
      }),
    );

    act(() => {
      fireEvent.keyDown(document, { key: 'b', code: 'KeyB', altKey: true });
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('カスタム関数の判定条件でコールバックが実行される', () => {
    const callback = vi.fn();
    renderHook(() =>
      useKeyboardShortcut((e) => e.key === 'k' && e.ctrlKey, callback),
    );

    act(() => {
      fireEvent.keyDown(window, { key: 'k', code: 'KeyK', ctrlKey: true });
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
