import type { FormationPosition } from '../data/formations';
import {
  getPositionGroup,
  getSideScore,
  type PositionGroup,
} from './player-formatting-helpers';

export * from './player-formatting-helpers';

export interface PositionMatchablePlayer {
  position?: string;
  slotVertical?: number;
  slotHorizontal?: number;
}

/**
 * 縦深さスコア (小さいほどGK側、大きいほどFW側)
 */
function getPlayerDepthScore(p: PositionMatchablePlayer): number {
  if (p.slotVertical !== undefined && p.slotVertical !== null) {
    return p.slotVertical;
  }
  const pos = (p.position || '').toUpperCase().trim();
  if (pos === 'GK') return 0;
  if (['DC', 'CB', 'SW'].includes(pos)) return 2.5;
  if (['DL', 'DR', 'LB', 'RB', 'DF'].includes(pos)) return 2.8;
  if (['DML', 'DMR', 'LWB', 'RWB'].includes(pos)) return 3.5;
  if (['DMC', 'DM'].includes(pos)) return 4.5;
  if (['MC', 'CM', 'MID', 'MF'].includes(pos)) return 5.5;
  if (['ML', 'MR', 'LM', 'RM'].includes(pos)) return 6.0;
  if (['AMC', 'AM'].includes(pos)) return 7.0;
  if (['AML', 'AMR', 'LW', 'RW', 'FWL', 'FWR'].includes(pos)) return 7.5;
  if (['SS'].includes(pos)) return 8.2;
  if (['FW', 'ST', 'CF'].includes(pos)) return 9.0;
  return 5.5; // Sub, Other
}

/**
 * 横方向スコア (0: 最左翼, 100: 最右翼)
 */
function getPlayerLeftScore(p: PositionMatchablePlayer): number {
  if (p.slotHorizontal !== undefined && p.slotHorizontal !== null) {
    return (10 - p.slotHorizontal) * 10;
  }
  const side = getSideScore(p.position);
  if (side === 1) return 15;
  if (side === 3) return 85;
  return 50;
}

/**
 * 選手群をフォーメーションテンプレートの各位置 (FormationPosition) に最適マッチングする
 */
export function matchPlayersToFormationPositions<
  T extends PositionMatchablePlayer,
>(
  players: T[],
  templatePositions: FormationPosition[],
): Array<{ player: T; templatePos: FormationPosition }> {
  if (!players.length || !templatePositions.length) return [];

  // (a) templatePositions を守備側 (top降順) にソート
  const sortedTemplates = [...templatePositions].sort((a, b) => b.top - a.top);

  // 近接する top (差が 8 以下) を同一ラインとしてグループ化
  const lines: FormationPosition[][] = [];
  for (const pos of sortedTemplates) {
    const currentLine = lines[lines.length - 1];
    if (currentLine && Math.abs(currentLine[0].top - pos.top) <= 8) {
      currentLine.push(pos);
    } else {
      lines.push([pos]);
    }
  }

  // 各ライン内を left 昇順 (左 -> 右) に並べる
  for (const line of lines) {
    line.sort((a, b) => a.left - b.left);
  }

  // (b) players を縦深さスコア昇順 (GK側 -> FW側) でソート
  const sortedPlayers = [...players].sort(
    (a, b) => getPlayerDepthScore(a) - getPlayerDepthScore(b),
  );

  // (c) 各ラインの枠数ずつに切り分け、ライン内で横スコア (leftScore) 昇順にソートして 1対1 ペアリング
  const result: Array<{ player: T; templatePos: FormationPosition }> = [];
  let playerOffset = 0;

  for (const line of lines) {
    const lineSlotsCount = line.length;
    const linePlayers = sortedPlayers.slice(
      playerOffset,
      playerOffset + lineSlotsCount,
    );
    playerOffset += lineSlotsCount;

    // ライン内の選手を leftScore (左 -> 右) 昇順にソート
    linePlayers.sort((a, b) => getPlayerLeftScore(a) - getPlayerLeftScore(b));

    for (let i = 0; i < lineSlotsCount; i++) {
      if (linePlayers[i] && line[i]) {
        result.push({
          player: linePlayers[i],
          templatePos: line[i],
        });
      }
    }
  }

  return result;
}

/**
 * 選手オブジェクトを 縦グループ (GK->DF->MF->FW->OTHER) および 横方向 (Left->Center->Right) で2Dソートする
 */
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

export interface PlayerShirtNoSource {
  shirtNo?: unknown;
  number?: unknown;
  jerseyNumber?: unknown;
  [key: string]: unknown;
}

/**
 * 選手オブジェクトから背番号を取得する
 * 各種データソース(Club, National, Store)の差異を吸収する
 */
export function getShirtNo(player?: PlayerShirtNoSource | null): string {
  if (!player) return '';
  const toStr = (val: unknown): string => (val != null ? String(val) : '');
  return (
    toStr(player.shirtNo) ||
    toStr(player.number) ||
    toStr(player.jerseyNumber) ||
    ''
  );
}
