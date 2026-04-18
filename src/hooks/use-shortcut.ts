'use client';

import { useCallback, useEffect } from 'react';
import {
  isActionMatch,
  isInputFocused,
  SHORTCUT_ACTIONS,
  SHORTCUT_CONFIG,
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (ignoreInput && isInputFocused()) return;

      if (typeof actionOrConfig === 'function') {
        if (actionOrConfig(e)) {
          e.preventDefault();
          callback(e);
        }
        return;
      }

      if (isActionMatch(e, actionOrConfig)) {
        e.preventDefault();
        callback(e);
      }
    },
    [actionOrConfig, callback, enabled, ignoreInput],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
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
