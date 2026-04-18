/**
 * ショートカットアクションの定義
 */
export const SHORTCUT_ACTIONS = {
  TOGGLE_MATCH_MEMO: 'TOGGLE_MATCH_MEMO',
  TOGGLE_TACTICAL_BOARD: 'TOGGLE_TACTICAL_BOARD',
  OPEN_QUICK_EVENT: 'OPEN_QUICK_EVENT',
  SAVE_MEMO: 'SAVE_MEMO',
  CLOSE_MODAL: 'CLOSE_MODAL',
} as const;

export type ShortcutAction =
  (typeof SHORTCUT_ACTIONS)[keyof typeof SHORTCUT_ACTIONS];

export interface SimpleKeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
}

/**
 * キーとアクションの対応（デフォルト設定）
 * 将来的に localStorage などから読み込むように拡張可能
 */
export const SHORTCUT_CONFIG: Record<
  ShortcutAction,
  { key: string; ctrl?: boolean; shift?: boolean }
> = {
  [SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO]: { key: 'm', ctrl: true },
  [SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD]: { key: 'b', ctrl: true },
  [SHORTCUT_ACTIONS.OPEN_QUICK_EVENT]: { key: 'i', ctrl: true },
  [SHORTCUT_ACTIONS.SAVE_MEMO]: { key: 'Enter', ctrl: true },
  [SHORTCUT_ACTIONS.CLOSE_MODAL]: { key: 'Escape' },
};

/**
 * 入力要素（input, textarea）にフォーカスがあるかチェック
 */
export const isInputFocused = () => {
  const activeEl = document.activeElement;
  if (!activeEl) return false;
  return (
    activeEl.tagName === 'INPUT' ||
    activeEl.tagName === 'TEXTAREA' ||
    (activeEl as HTMLElement).isContentEditable
  );
};

/**
 * イベントが指定のアクションまたは設定に合致するか判定
 */
export const isActionMatch = (
  e: KeyboardEvent,
  actionOrConfig: ShortcutAction | SimpleKeyConfig,
) => {
  let keyConf: SimpleKeyConfig;
  if (typeof actionOrConfig === 'string') {
    keyConf = SHORTCUT_CONFIG[actionOrConfig];
  } else {
    keyConf = actionOrConfig;
  }

  if (!keyConf) return false;

  const targetKey = keyConf.key.toLowerCase();
  const eventKey = (e.key || '').toLowerCase();
  const eventCode = e.code || '';

  // モディファイア判定を先に計算
  const isCtrlMatch = !!keyConf.ctrl === (e.ctrlKey || e.metaKey);
  const isShiftMatch = !!keyConf.shift === e.shiftKey;

  // Escape の特別扱い
  if (targetKey === 'escape' || targetKey === 'esc') {
    // Escape の場合は、修飾キー（Ctrl/Shift）が押されていなければ常に許容
    const looksLikeEscape =
      eventCode === 'Escape' ||
      eventKey === 'escape' ||
      eventKey === 'esc' ||
      (e as any).keyCode === 27;

    if (looksLikeEscape && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      return true;
    }
  }

  // 通常キー判定
  const isKeyMatch = eventKey === targetKey;

  return isKeyMatch && isCtrlMatch && isShiftMatch;
};
