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
