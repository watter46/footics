"use client";

import { useEffect, useCallback } from "react";
import { isInputFocused, SHORTCUT_CONFIG, ShortcutAction, SHORTCUT_ACTIONS } from "@/lib/shortcuts";

interface SimpleKeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * キーボードショートカットを登録するカスタムフック
 * @param actionOrConfig ショートカットアクション名、または直接のキー設定
 * @param callback 実行されるアクション
 * @param options 追加設定
 */
export function useKeyboardShortcut(
  actionOrConfig: ShortcutAction | SimpleKeyConfig,
  callback: (e: KeyboardEvent) => void,
  options: { enabled?: boolean; ignoreInput?: boolean } = {}
) {
  const { enabled = true, ignoreInput = true } = options;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;
      if (ignoreInput && isInputFocused()) return;

      let keyConf: SimpleKeyConfig;
      if (typeof actionOrConfig === "string") {
        keyConf = SHORTCUT_CONFIG[actionOrConfig];
      } else {
        keyConf = actionOrConfig;
      }

      if (!keyConf) return;

      const isKeyMatch = e.key.toLowerCase() === keyConf.key.toLowerCase();
      const isCtrlMatch = !!keyConf.ctrl === (e.ctrlKey || e.metaKey); // Ctrl or Cmd
      const isShiftMatch = !!keyConf.shift === e.shiftKey;

      if (isKeyMatch && isCtrlMatch && isShiftMatch) {
        e.preventDefault();
        callback(e);
      }
    },
    [actionOrConfig, callback, enabled, ignoreInput]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * 外部（Chrome拡張など）からのアクション呼び出しを可能にする
 * @param callbackKey アクション名
 * @param action 実行する関数
 */
export function useExternalAction(actionName: ShortcutAction, action: () => void) {
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail?.action === actionName) {
        action();
      }
    };

    window.addEventListener("footics-action", handler);
    (window as any).__trigger_shortcut = (name: string) => {
      window.dispatchEvent(new CustomEvent("footics-action", { detail: { action: name } }));
    };

    return () => window.removeEventListener("footics-action", handler);
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
  options: { closeOnEsc?: boolean } = {}
) {
  const { closeOnEsc = true } = options;

  // Toggle on action key
  useKeyboardShortcut(action, () => setOpen(prev => !prev), { ignoreInput: false });

  // Close on Escape (only if requested)
  if (closeOnEsc) {
    useKeyboardShortcut(SHORTCUT_ACTIONS.CLOSE_MODAL, () => setOpen(false), { 
      ignoreInput: false 
    });
  }

  // Support external API trigger
  useExternalAction(action, () => setOpen(prev => !prev));
}
