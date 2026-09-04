export interface QuickTag {
  key: string;
  label: string;
  shortcut: string;
}

/**
 * プリセットクイックタグ
 * 動画視聴中や分析中に 1〜4 の数字キーで瞬時に選択できる戦術カテゴリ
 */
export const QUICK_TAGS: QuickTag[] = [
  { key: 'buildup', label: 'ビルドアップ', shortcut: '1' },
  { key: 'press', label: 'プレス', shortcut: '2' },
  { key: 'transition', label: 'トランジション', shortcut: '3' },
  { key: 'setpiece', label: 'セットプレー', shortcut: '4' },
];
