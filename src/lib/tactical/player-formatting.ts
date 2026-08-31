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
    ].includes(pos)
  )
    return 'MID';
  if (['FW', 'ST', 'SS', 'CF', 'LW', 'RW', 'WF', 'LF', 'RF'].includes(pos))
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
    ].includes(pos)
  )
    return 'MF';
  if (['FW', 'ST', 'SS', 'CF', 'LW', 'RW', 'WF', 'LF', 'RF'].includes(pos))
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
  if (['DL', 'LWB', 'AML', 'LM', 'LW', 'LF'].includes(pos)) return 1;
  if (['DR', 'RWB', 'AMR', 'RM', 'RW', 'RF'].includes(pos)) return 3;
  return 2; // Default Center (DC, CB, DMC, MC, AMC, CM, DM, AM, ST, SS, CF, GK, etc.)
}

/**
 * 選手オブジェクトを 縦グループ (GK->DF->MF->FW->OTHER) および 横方向 (Left->Center->Right) で2Dソートする
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortPlayersBy2DPositionGroup<T extends { position?: string }>(
  players: T[],
): T[] {
  const getGroupPriority = (p: T): number => {
    const group = getPositionGroup(p.position);
    switch (group) {
      case 'GK':
        return 1;
      case 'DF':
        return 2;
      case 'MF':
        return 3;
      case 'FW':
        return 4;
      default:
        return 5;
    }
  };

  return [...players].sort((a, b) => {
    const gA = getGroupPriority(a);
    const gB = getGroupPriority(b);
    if (gA !== gB) return gA - gB;

    const sA = getSideScore(a.position);
    const sB = getSideScore(b.position);
    return sA - sB;
  });
}

/**
 * 選手配列を 4ポジション (GK, DF, MF, FW, OTHER) ごとにグループ分けし、
 * 各グループ内を 2D (縦・横) ソートして返す
 */
export function groupPlayersByPosition<T extends { position?: string }>(
  players: T[],
): Record<PositionGroup, T[]> {
  const sorted = sortPlayersBy2DPositionGroup(players);
  const groups: Record<PositionGroup, T[]> = {
    GK: [],
    DF: [],
    MF: [],
    FW: [],
    OTHER: [],
  };

  for (const player of sorted) {
    const group = getPositionGroup(player.position);
    groups[group].push(player);
  }

  return groups;
}

/**
 * 選手名を短縮形式に変換する
 * 例: "Enzo Fernandez" -> "E. Fernandez"
 */
export function shortenName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  const last = parts[parts.length - 1];
  const initial = parts[0].charAt(0);
  return `${initial}. ${last}`;
}

/**
 * 選手名からラストネーム (姓 / 最後の単語) を抽出する
 * 例: "Lionel Messi" -> "Messi", "Kaoru Mitoma" -> "Mitoma", "Neymar" -> "Neymar"
 */
export function getLastName(fullName: string): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;
  return parts[parts.length - 1];
}

/**
 * マーカーID文字列 (例: "chelsea-tactics-board-345003", "match123-10", "10") から playerId を安全に抽出する
 */
export function parsePlayerIdFromMarkerId(id: string): number | null {
  if (!id || id === 'ball') return null;
  const lastHyphenIndex = id.lastIndexOf('-');
  const idStr = lastHyphenIndex !== -1 ? id.slice(lastHyphenIndex + 1) : id;
  const pId = parseInt(idStr, 10);
  return Number.isNaN(pId) ? null : pId;
}

/**
 * 選手オブジェクトから背番号を取得する
 * 各種データソース(Club, National, Store)の差異を吸収する
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getShirtNo(player: any): string {
  if (!player) return '';
  return (
    player.shirtNo?.toString() ||
    player.number?.toString() ||
    player.jerseyNumber?.toString() ||
    ''
  );
}
