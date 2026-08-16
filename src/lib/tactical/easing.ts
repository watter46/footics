export type EasingType =
  | 'linear'
  | 'easeInOut'
  | 'cubic'
  | 'easeOut'
  | 'easeIn';

export interface EasingOption {
  value: EasingType;
  label: string;
  shortLabel: string;
  description: string;
}

export const EASING_OPTIONS: EasingOption[] = [
  {
    value: 'linear',
    label: '等速 (Linear)',
    shortLabel: '等速',
    description: '加減速なし・常に一定速度（パスや機械的な移動向き）',
  },
  {
    value: 'easeInOut',
    label: '滑らか (Ease In/Out)',
    shortLabel: '滑らか',
    description: '自然な加減速（選手の標準的なランニング向き）',
  },
  {
    value: 'cubic',
    label: '強め (Cubic)',
    shortLabel: '強め',
    description: '強弱のはっきりした加減速（ダイナミックな展開向き）',
  },
  {
    value: 'easeOut',
    label: '減速 (Ease Out)',
    shortLabel: '減速',
    description: '素早く動き出し徐々にストップ（トラップや急停止向き）',
  },
  {
    value: 'easeIn',
    label: '加速 (Ease In)',
    shortLabel: '加速',
    description: 'ゆっくり動き出し徐々に加速（助走や急加速向き）',
  },
];

/**
 * 0.0〜1.0 の正規化時間 t にイージングを適用して補間値を返す
 */
export function applyEasing(t: number, type: EasingType = 'easeInOut'): number {
  const clamped = Math.max(0, Math.min(1, t));

  switch (type) {
    case 'linear':
      return clamped;

    case 'easeInOut':
      // easeInOutQuad: 滑らかで自然
      return clamped < 0.5
        ? 2 * clamped * clamped
        : 1 - (-2 * clamped + 2) ** 2 / 2;

    case 'cubic':
      // easeInOutCubic: 強めの加減速
      return clamped < 0.5
        ? 4 * clamped * clamped * clamped
        : 1 - (-2 * clamped + 2) ** 3 / 2;

    case 'easeOut':
      // easeOutQuad: 最初が速く、徐々に止まる
      return 1 - (1 - clamped) * (1 - clamped);

    case 'easeIn':
      // easeInQuad: 最初が遅く、徐々に加速
      return clamped * clamped;

    default:
      return clamped;
  }
}
