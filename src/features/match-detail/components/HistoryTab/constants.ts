import {
  AlertTriangle,
  ArrowRightLeft,
  Brain,
  Footprints,
  Goal,
  Hand,
  MoveRight,
  Shield,
  Star,
  Tangent,
} from 'lucide-react';

import type { CategoryMeta } from './types';

export const DEFAULT_CATEGORY_META: CategoryMeta = {
  label: 'その他',
  markerClassName: 'text-slate-400',
  icon: Star, // フォールバックアイコン
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  パス: {
    label: 'パス',
    markerClassName: 'text-emerald-400', // 攻撃（緑）
    icon: ArrowRightLeft,
  },
  シュート: {
    label: 'シュート',
    markerClassName: 'text-emerald-400', // 攻撃（緑）
    icon: Goal,
  },
  オフザボール: {
    label: 'オフザボール',
    markerClassName: 'text-emerald-400', // 攻撃（緑）
    icon: Footprints,
  },
  キャリー: {
    label: 'キャリー',
    markerClassName: 'text-emerald-400', // 攻撃（緑）
    icon: MoveRight,
  },
  コントロール: {
    label: 'コントロール',
    markerClassName: 'text-emerald-400', // 攻撃（緑）
    icon: Tangent,
  },
  守備: {
    label: '守備',
    markerClassName: 'text-rose-400',
    icon: Shield,
  },
  GK: {
    label: 'GK',
    markerClassName: 'text-sky-400',
    icon: Hand,
  },
  エラー: {
    label: 'エラー',
    markerClassName: 'text-red-600',
    icon: AlertTriangle,
  },
  印象: {
    label: '印象',
    markerClassName: 'text-slate-200',
    icon: Brain,
  },
};

export const CATEGORY_ORDER: string[] = [
  'パス',
  'シュート',
  'オフザボール',
  'キャリー',
  'コントロール',
  '守備',
  'GK',
  'エラー',
  '印象',
];

export const FAVORITE_CATEGORY_META: CategoryMeta = {
  label: 'お気に入り',
  markerClassName: 'text-amber-400',
  icon: Star,
};
