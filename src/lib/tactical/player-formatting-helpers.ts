import type { StandardPosition } from '@/types';

export type PositionGroup = 'GK' | 'DF' | 'MF' | 'FW' | 'OTHER';

export const POSITION_GROUPS: PositionGroup[] = [
  'GK',
  'DF',
  'MF',
  'FW',
  'OTHER',
];

export const POSITION_GROUP_LABELS: Record<PositionGroup, string> = {
  GK: 'Goalkeepers',
  DF: 'Defenders',
  MF: 'Midfielders',
  FW: 'Forwards',
  OTHER: 'Other',
};

/**
 * 任意のポジション文字列を GK / DF / MID / FW / Other の5区分に正規化する
 */
export function normalizePosition(position?: string): StandardPosition {
  if (!position) return 'Other';
  const pos = position.trim().toUpperCase();
  if (pos === 'GK') return 'GK';
  if (
    ['DF', 'DR', 'DC', 'DL', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(pos)
  )
    return 'DF';
  if (
    [
      'MID',
      'MF',
      'DMC',
      'MC',
      'AMC',
      'AMR',
      'AML',
      'DM',
      'CM',
      'AM',
      'LM',
      'RM',
      'MR',
      'ML',
      'DML',
      'DMR',
    ].includes(pos)
  )
    return 'MID';
  if (
    [
      'FW',
      'ST',
      'SS',
      'CF',
      'LW',
      'RW',
      'WF',
      'LF',
      'RF',
      'FWL',
      'FWR',
    ].includes(pos)
  )
    return 'FW';
  return 'Other';
}

/**
 * 任意のポジション文字列を 4ポジション区分 ('GK' | 'DF' | 'MF' | 'FW' | 'OTHER') に分類する
 */
export function getPositionGroup(position?: string): PositionGroup {
  if (!position) return 'OTHER';
  const pos = position.trim().toUpperCase();
  if (pos === 'GK') return 'GK';
  if (
    ['DF', 'DR', 'DC', 'DL', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(pos)
  )
    return 'DF';
  if (
    [
      'MID',
      'MF',
      'DMC',
      'MC',
      'AMC',
      'AMR',
      'AML',
      'DM',
      'CM',
      'AM',
      'LM',
      'RM',
      'MR',
      'ML',
      'DML',
      'DMR',
    ].includes(pos)
  )
    return 'MF';
  if (
    [
      'FW',
      'ST',
      'SS',
      'CF',
      'LW',
      'RW',
      'WF',
      'LF',
      'RF',
      'FWL',
      'FWR',
    ].includes(pos)
  )
    return 'FW';
  return 'OTHER';
}

/**
 * ポジションバッジ用のTailwind CSSクラスを取得する
 * GK: 黄色/アンバー, DF: 青/シアン, MF: 緑/エメラルド, FW: 赤/ローズ, OTHER: ニュートラル/スレート
 */
export function getPositionBadgeClass(position?: string): string {
  const group = getPositionGroup(position);
  switch (group) {
    case 'GK':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'DF':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    case 'MF':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'FW':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
  }
}

/**
 * ポジションから横方向の優先度スコア (1: Left, 2: Center, 3: Right) を返す
 */
export function getSideScore(position?: string): number {
  const pos = (position || '').toUpperCase();
  if (['DL', 'LWB', 'AML', 'LM', 'LW', 'LF', 'DML', 'FWL'].includes(pos))
    return 1;
  if (['DR', 'RWB', 'AMR', 'RM', 'RW', 'RF', 'DMR', 'FWR'].includes(pos))
    return 3;
  return 2; // Default Center (DC, CB, DMC, MC, AMC, CM, DM, AM, ST, SS, CF, GK, etc.)
}
