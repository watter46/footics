import { useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { isInputFocused } from '@/lib/shortcuts';

export interface TacticalShortcutsOptions {
  undo?: () => void;
  redo?: () => void;
  deleteSelected?: () => void;
  clearSelection?: () => void;
  toggleFocusMode?: () => void;
  enabled?: boolean;
}

/**
 * 宣言的な戦術ボード用キーボードショートカットフック
 *
 * 入力フォーム（input / textarea / contenteditable）にフォーカスがある場合は
 * 自動的に誤爆を防止します。
 */
export function useTacticalShortcuts({
  undo,
  redo,
  deleteSelected,
  clearSelection,
  toggleFocusMode,
  enabled = true,
}: TacticalShortcutsOptions): void {
  // Undo: mod+z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    'mod+z',
    (event) => {
      if (isInputFocused()) return;
      event.preventDefault();
      undo?.();
    },
    { enabled: enabled && Boolean(undo), enableOnFormTags: false },
    [undo, enabled],
  );

  // Redo: mod+shift+z, mod+y
  useHotkeys(
    ['mod+shift+z', 'mod+y'],
    (event) => {
      if (isInputFocused()) return;
      event.preventDefault();
      redo?.();
    },
    { enabled: enabled && Boolean(redo), enableOnFormTags: false },
    [redo, enabled],
  );

  // Delete / Backspace: 選択中オブジェクトの削除
  useHotkeys(
    ['backspace', 'delete'],
    (event) => {
      if (isInputFocused()) return;
      event.preventDefault();
      deleteSelected?.();
    },
    { enabled: enabled && Boolean(deleteSelected), enableOnFormTags: false },
    [deleteSelected, enabled],
  );

  // Escape: 選択解除
  useHotkeys(
    'escape',
    (event) => {
      if (isInputFocused()) return;
      event.preventDefault();
      clearSelection?.();
    },
    { enabled: enabled && Boolean(clearSelection), enableOnFormTags: false },
    [clearSelection, enabled],
  );

  // Focus Mode toggle via shortcut '\' (RAII event listener)
  useEffect(() => {
    if (!enabled || !toggleFocusMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable ||
        isInputFocused()
      ) {
        return;
      }

      if (event.key === '\\') {
        event.preventDefault();
        toggleFocusMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleFocusMode, enabled]);
}
