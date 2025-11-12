import type { CategoryMeta } from './types';

export const DEFAULT_CATEGORY_META: CategoryMeta = {
  label: '⚪ その他',
  markerClassName: 'text-slate-400',
};

export const CATEGORY_META: Record<string, CategoryMeta> = {
  攻撃: { label: '🟩 攻撃', markerClassName: 'text-emerald-400' },
  守備: { label: '🟥 守備', markerClassName: 'text-rose-400' },
  トランジション: { label: '🟨 トランジション', markerClassName: 'text-amber-300' },
  イベント: { label: '🟦 イベント', markerClassName: 'text-sky-400' },
  'メンタル/その他': { label: '⚪ メンタル', markerClassName: 'text-slate-200' },
};
