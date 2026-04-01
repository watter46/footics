/**
 * ショートカットアクションの定義
 */
export const SHORTCUT_ACTIONS = {
  TOGGLE_MATCH_MEMO: "TOGGLE_MATCH_MEMO",
  TOGGLE_TACTICAL_BOARD: "TOGGLE_TACTICAL_BOARD",
  OPEN_QUICK_EVENT: "OPEN_QUICK_EVENT",
  SAVE_MEMO: "SAVE_MEMO",
  CLOSE_MODAL: "CLOSE_MODAL",
} as const;

export type ShortcutAction = typeof SHORTCUT_ACTIONS[keyof typeof SHORTCUT_ACTIONS];

/**
 * キーとアクションの対応（デフォルト設定）
 * 将来的に localStorage などから読み込むように拡張可能
 */
export const SHORTCUT_CONFIG: Record<ShortcutAction, { key: string; ctrl?: boolean; shift?: boolean }> = {
  [SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO]: { key: "m", ctrl: true },
  [SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD]: { key: "b", ctrl: true },
  [SHORTCUT_ACTIONS.OPEN_QUICK_EVENT]: { key: "i", ctrl: true },
  [SHORTCUT_ACTIONS.SAVE_MEMO]: { key: "Enter", ctrl: true },
  [SHORTCUT_ACTIONS.CLOSE_MODAL]: { key: "Escape" },
};

/**
 * 入力要素（input, textarea）にフォーカスがあるかチェック
 */
export const isInputFocused = () => {
  const activeEl = document.activeElement;
  if (!activeEl) return false;
  return (
    activeEl.tagName === "INPUT" ||
    activeEl.tagName === "TEXTAREA" ||
    (activeEl as HTMLElement).isContentEditable
  );
};
