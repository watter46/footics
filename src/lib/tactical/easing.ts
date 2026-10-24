import gsap from 'gsap';

export type EasingType =
  | 'linear'
  | 'easeInOut'
  | 'cubic'
  | 'easeOut'
  | 'easeIn'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out';

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
    value: 'ease-in-out',
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
    value: 'ease-out',
    label: '減速 (Ease Out)',
    shortLabel: '減速',
    description: '素早く動き出し徐々にストップ（トラップや急停止向き）',
  },
  {
    value: 'ease-in',
    label: '加速 (Ease In)',
    shortLabel: '加速',
    description: 'ゆっくり動き出し徐々に加速（助走や急加速向き）',
  },
];

export const GSAP_EASE_MAP: Record<string, string> = {
  linear: 'none',
  easeInOut: 'power1.inOut',
  'ease-in-out': 'power1.inOut',
  cubic: 'power2.inOut',
  easeOut: 'power1.out',
  'ease-out': 'power1.out',
  easeIn: 'power1.in',
  'ease-in': 'power1.in',
};

/**
 * 0.0〜1.0 の正規化時間 t に GSAP イージングを適用して補間値を返す
 */
export function applyEasing(
  t: number,
  type: EasingType | string = 'ease-in-out',
): number {
  const clamped = Math.max(0, Math.min(1, t));
  const gsapEaseName = GSAP_EASE_MAP[type] ?? type ?? 'power1.inOut';
  const easeFn = gsap.parseEase(gsapEaseName);
  return easeFn(clamped);
}
