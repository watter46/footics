import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { isShortcutAction, SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useExternalAction, useKeyboardShortcut } from '../use-shortcut';

describe('isShortcutAction', () => {
  it('有効な ShortcutAction 文字列を正しく true と判定する', () => {
    expect(isShortcutAction(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD)).toBe(true);
    expect(isShortcutAction(SHORTCUT_ACTIONS.SAVE_MEMO)).toBe(true);
    expect(isShortcutAction(SHORTCUT_ACTIONS.CLOSE_MODAL)).toBe(true);
  });

  it('無効な値や型を false と判定する', () => {
    expect(isShortcutAction('INVALID_ACTION')).toBe(false);
    expect(isShortcutAction('')).toBe(false);
    expect(isShortcutAction(null)).toBe(false);
    expect(isShortcutAction(undefined)).toBe(false);
    expect(isShortcutAction(123)).toBe(false);
    expect(isShortcutAction({})).toBe(false);
  });
});

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

describe('useExternalAction', () => {
  it('postMessage で FOOTICS_ACTION を受信したときにアクションが実行される', () => {
    const action = vi.fn();
    const { unmount } = renderHook(() =>
      useExternalAction(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, action),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'FOOTICS_ACTION',
            action: SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD,
          },
        }),
      );
    });

    expect(action).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('__trigger_shortcut 呼び出し時に postMessage が送信され CustomEvent は dispatch されない', () => {
    const action = vi.fn();
    const postMessageSpy = vi
      .spyOn(window, 'postMessage')
      .mockImplementation(() => {});
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    const { unmount } = renderHook(() =>
      useExternalAction(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, action),
    );

    act(() => {
      window.__trigger_shortcut?.(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD);
    });

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        type: 'FOOTICS_ACTION',
        action: SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD,
      },
      expect.any(String),
    );
    expect(dispatchSpy).not.toHaveBeenCalled();

    postMessageSpy.mockRestore();
    dispatchSpy.mockRestore();
    unmount();
  });

  it('アンマウント時に __trigger_shortcut がクリーンアップされる', () => {
    const action = vi.fn();
    const { unmount } = renderHook(() =>
      useExternalAction(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, action),
    );

    expect(window.__trigger_shortcut).toBeDefined();
    unmount();
    expect(window.__trigger_shortcut).toBeUndefined();
  });
});
