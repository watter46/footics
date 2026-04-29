'use client';

import hotkeys from 'hotkeys-js';
import { useEffect } from 'react';
import {
  configToHotkeyString,
  isInputFocused,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type SimpleKeyConfig,
} from '@/lib/shortcuts';

/**
 * キーボードショートカットを登録するカスタムフック
 * @param actionOrConfig ショートカットアクション名、または直接のキー設定
 * @param callback 実行されるアクション
 * @param options 追加設定
 */
export function useKeyboardShortcut(
  actionOrConfig:
    | ShortcutAction
    | SimpleKeyConfig
    | ((e: KeyboardEvent) => boolean),
  callback: (e: KeyboardEvent) => void,
  options: { enabled?: boolean; ignoreInput?: boolean } = {},
) {
  const { enabled = true, ignoreInput = true } = options;

  useEffect(() => {
    if (!enabled) return;

    // カスタム判定関数の場合は、従来の window イベントリスナーを使用
    if (typeof actionOrConfig === 'function') {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (ignoreInput && isInputFocused()) return;
        if (actionOrConfig(e)) {
          e.preventDefault();
          callback(e);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    // hotkeys-js を使用した登録
    const hotkeyStr = configToHotkeyString(actionOrConfig);
    if (!hotkeyStr) return;

    const handler = (event: KeyboardEvent) => {
      if (ignoreInput && isInputFocused()) return;
      event.preventDefault();
      callback(event);
    };

    hotkeys(hotkeyStr, handler);
    return () => hotkeys.unbind(hotkeyStr, handler);
  }, [actionOrConfig, callback, enabled, ignoreInput]);
}

/**
 * 外部（Chrome拡張など）からのアクション呼び出しを可能にする
 * @param callbackKey アクション名
 * @param action 実行する関数
 */
export function useExternalAction(
  actionName: ShortcutAction,
  action: () => void,
) {
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.action === actionName) {
        action();
      }
    };

    window.addEventListener('footics-action', handler);
    (window as any).__trigger_shortcut = (name: string) => {
      window.dispatchEvent(
        new CustomEvent('footics-action', { detail: { action: name } }),
      );
    };

    return () => window.removeEventListener('footics-action', handler);
  }, [actionName, action]);
}

/**
 * モーダルの開閉を管理する抽象化されたショートカットフック
 * - 指定アクションキーでトグル（開閉）
 * - Escキーで強制閉じる
 * - 外部APIからの制御も統合
 */
export function useModalToggleShortcut(
  action: ShortcutAction,
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void,
  options: { closeOnEsc?: boolean; isOpen?: boolean } = {},
) {
  const { closeOnEsc = true, isOpen = false } = options;

  // Toggle on action key (Always available to open/close)
  useKeyboardShortcut(action, () => setOpen((prev) => !prev), {
    ignoreInput: false,
  });

  // Close on Escape (Only if modal is actually OPEN)
  useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, () => setOpen(false), {
    enabled: isOpen && closeOnEsc,
    ignoreInput: false,
  });

  // Support external API trigger
  useExternalAction(action, () => setOpen((prev) => !prev));
}
