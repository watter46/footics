import type { StandardPosition } from '@/types';

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
 * ポジションから横方向の優先度スコア (1: Left, 2: Center, 3: Right) を返す
 */
export function getSideScore(position?: string): number {
  const pos = (position || '').toUpperCase();
  if (['DL', 'LWB', 'AML', 'LM', 'LW'].includes(pos)) return 1;
  if (['DR', 'RWB', 'AMR', 'RM', 'RW'].includes(pos)) return 3;
  return 2; // Default Center (DC, CB, DMC, MC, AMC, CM, DM, AM, ST, SS, GK, etc.)
}

/**
 * 選手オブジェクトを 縦グループ (GK->DF->MF->FW) および 横方向 (Left->Center->Right) で2Dソートする
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sortPlayersBy2DPositionGroup(players: any[]): any[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getGroupPriority = (p: any): number => {
    const pos = (p.position || '').toUpperCase();
    if (pos === 'GK') return 1;
    if (['DR', 'DC', 'DL', 'CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos))
      return 2;
    if (
      ['DMC', 'MC', 'AMC', 'AMR', 'AML', 'DM', 'CM', 'AM', 'LM', 'RM'].includes(
        pos,
      )
    )
      return 3;
    if (['FW', 'ST', 'SS', 'LW', 'RW'].includes(pos)) return 4;
    return 5;
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
