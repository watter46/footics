/**
 * ショートカットアクションの定義
 */
export const SHORTCUT_ACTIONS = {
  TOGGLE_TACTICAL_BOARD: 'TOGGLE_TACTICAL_BOARD',
  SAVE_MEMO: 'SAVE_MEMO',
  CLOSE_MODAL: 'CLOSE_MODAL',
  REFRESH_DATA: 'REFRESH_DATA',
  SET_PERIOD_1: 'SET_PERIOD_1',
  SET_PERIOD_2: 'SET_PERIOD_2',
  SET_PERIOD_3: 'SET_PERIOD_3',
  SET_PERIOD_4: 'SET_PERIOD_4',
  SET_PERIOD_5: 'SET_PERIOD_5',
} as const;

export type ShortcutAction =
  (typeof SHORTCUT_ACTIONS)[keyof typeof SHORTCUT_ACTIONS];

export interface SimpleKeyConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  alt?: boolean;
}

/**
 * キーとアクションの対応（デフォルト設定）
 * 将来的に localStorage などから読み込むように拡張可能
 */
export const SHORTCUT_CONFIG: Record<
  ShortcutAction,
  { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }
> = {
  [SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD]: { key: 'b', alt: true },
  [SHORTCUT_ACTIONS.SAVE_MEMO]: { key: 'Enter', ctrl: true },
  [SHORTCUT_ACTIONS.CLOSE_MODAL]: { key: 'Escape' },
  // REFRESH_DATA はキー操作ではなくプログラム的に発火される（拡張機能からの通知）
  [SHORTCUT_ACTIONS.REFRESH_DATA]: { key: '' },
  [SHORTCUT_ACTIONS.SET_PERIOD_1]: { key: '1', alt: true },
  [SHORTCUT_ACTIONS.SET_PERIOD_2]: { key: '2', alt: true },
  [SHORTCUT_ACTIONS.SET_PERIOD_3]: { key: '3', alt: true },
  [SHORTCUT_ACTIONS.SET_PERIOD_4]: { key: '4', alt: true },
  [SHORTCUT_ACTIONS.SET_PERIOD_5]: { key: '5', alt: true },
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
  const isAltMatch = !!keyConf.alt === e.altKey;

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

  return isKeyMatch && isCtrlMatch && isShiftMatch && isAltMatch;
};

/**
 * SimpleKeyConfig を hotkeys-js 形式の文字列に変換する
 */
export const configToHotkeyString = (
  actionOrConfig: ShortcutAction | SimpleKeyConfig,
): string => {
  let conf: SimpleKeyConfig;
  if (typeof actionOrConfig === 'string') {
    conf = SHORTCUT_CONFIG[actionOrConfig];
  } else {
    conf = actionOrConfig;
  }

  if (!conf || !conf.key) return '';

  const parts: string[] = [];
  if (conf.ctrl || conf.meta) parts.push('ctrl'); // hotkeys-js では command も ctrl で扱われることが多いが、必要に応じて調整
  if (conf.alt) parts.push('alt');
  if (conf.shift) parts.push('shift');

  // hotkeys-js は小文字を推奨
  const key = conf.key.toLowerCase();
  parts.push(key);

  return parts.join('+');
};
