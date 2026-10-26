'use client';

import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
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
  const isFunction = typeof actionOrConfig === 'function';

  useEffect(() => {
    if (!enabled || !isFunction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (ignoreInput && isInputFocused()) return;
      if (actionOrConfig(e)) {
        e.preventDefault();
        callback(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actionOrConfig, callback, enabled, ignoreInput, isFunction]);

  const hotkeyStr = !isFunction ? configToHotkeyString(actionOrConfig) : '';
  const hotkeysList = hotkeyStr
    ? hotkeyStr.includes('ctrl+')
      ? [hotkeyStr, hotkeyStr.replace(/ctrl\+/g, 'meta+')]
      : [hotkeyStr]
    : [];

  useHotkeys(
    hotkeysList,
    (event) => {
      if (ignoreInput && isInputFocused()) return;
      event.preventDefault();
      callback(event);
    },
    {
      enabled: enabled && !isFunction && hotkeysList.length > 0,
      enableOnFormTags: !ignoreInput,
    },
    [hotkeysList, enabled, isFunction, ignoreInput, callback],
  );
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
    const handleMessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'FOOTICS_ACTION' && data.action === actionName) {
        action();
      } else if (
        data.type === 'footics-action' &&
        data.detail?.action === actionName
      ) {
        action();
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ action?: string }>;
      if (customEvent.detail?.action === actionName) {
        action();
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('footics-action', handleCustomEvent);

    const targetOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : '*';

    (window as any).__trigger_shortcut = (name: string) => {
      window.postMessage(
        { type: 'FOOTICS_ACTION', action: name },
        targetOrigin,
      );
    };

    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('footics-action', handleCustomEvent);
    };
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
