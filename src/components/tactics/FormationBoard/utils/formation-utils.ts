import {
  FORMATION_LIST,
  FORMATION_POSITIONS,
  type FormationType,
} from '@/lib/formation-template';
import type {
  FieldPosition,
  FieldPositionPlayer,
  GridPlayer,
  PlayerCoordinates,
} from '../types';

/**
 * 指定人数を中央揃えで均等配置するleft座標配列を返す関数
 * @param count - 選手数
 * @returns left座標（%）の配列
 */
function getLeftPositions(count: number): number[] {
  // 1人なら中央
  if (count === 1) return [50];
  // n人なら (i+1)/(n+1)*100 で均等配置
  return Array.from({ length: count }, (_, i) =>
    Math.round(((i + 1) / (count + 1)) * 100)
  );
}

/**
 * 列数によってtop座標の最小値・最大値を返す関数
 * @param columnsCount - 列数
 * @returns { minTop: number, maxTop: number }
 */
function getTopBandRange(columnsCount: number): {
  minTop: number;
  maxTop: number;
} {
  if (columnsCount === 5) return { minTop: 10, maxTop: 90 };
  if (columnsCount === 6) return { minTop: 5, maxTop: 95 };
  if (columnsCount >= 7) return { minTop: 0, maxTop: 100 };
  // 4列以下は10~90で統一
  return { minTop: 10, maxTop: 90 };
}

/**
 * GKを基準にtop座標を分割する関数
 * @param columnsCount - 列数（GK含む）
 * @returns 各列ごとのtop座標（%）配列
 */
function getTopPositions(columnsCount: number): number[] {
  const { minTop, maxTop } = getTopBandRange(columnsCount);
  const otherColumnsCount = columnsCount - 1;
  const bandHeight = (maxTop - minTop) / otherColumnsCount;

  const topPositions = Array.from({ length: otherColumnsCount }, (_, i) =>
    Math.round(minTop + bandHeight * i)
  );
  topPositions.push(maxTop);

  return topPositions.reverse();
}

function mapPlayersToCoordinates<T extends FieldPositionPlayer>(
  players: T[]
): Array<T & { coordinates: PlayerCoordinates }> {
  const positions = players.reduce((groups, player) => {
    const col = player.fieldPosition.col;
    if (!groups[col]) groups[col] = [];
    groups[col].push(player);
    return groups;
  }, {} as Record<number, T[]>);

  const groups = Object.values(positions);

  const columnsCount = groups.length;

  const groupPlayers = groups.map((group, groupIndex) => {
    const playersCount = group.length;

    const leftPositions = getLeftPositions(playersCount);

    const tops = getTopPositions(columnsCount);

    return group.map((player, i) => {
      const coordinates: PlayerCoordinates = {
        left: leftPositions[i],
        top: tops[groupIndex],
      };

      return {
        ...player,
        coordinates: coordinates,
      };
    });
  });

  return groupPlayers.flat();
}

/**
 * gridからフィールドポジションを解析
 * @param grid フォーメーションポジション文字列（例: "2:4"）
 * @returns FieldPosition（col: 列, row: 行）
 */
function parseGridPosition(grid: string): FieldPosition {
  const [colStr, rowStr] = grid.split(':');

  const col = parseInt(colStr, 10);
  const row = parseInt(rowStr, 10);

  return { col, row };
}

/**
 * FieldPositionPlayer配列をgrid（col, row）でソートする関数
 * @param players - ソート対象のFieldPositionPlayer配列
 * @returns ソート済みのFieldPositionPlayer配列
 */
export function sortFieldPositionPlayersByGrid<T extends FieldPositionPlayer>(
  players: T[]
): T[] {
  return [...players].sort((a, b) => {
    // colが小さい順
    if (a.fieldPosition.col !== b.fieldPosition.col) {
      return a.fieldPosition.col - b.fieldPosition.col;
    }
    // colが同じ場合はrowが小さい順
    return a.fieldPosition.row - b.fieldPosition.row;
  });
}

export function convertToFormationPlayers<T extends FieldPositionPlayer>(
  players: T[],
  formationType: string
): Array<T & { coordinates: PlayerCoordinates }> {
  const sortedPlayers = sortFieldPositionPlayersByGrid(players);

  if (!FORMATION_LIST.includes(formationType as FormationType)) {
    return mapPlayersToCoordinates(players);
  }

  const positions = FORMATION_POSITIONS[formationType as FormationType];

  return sortedPlayers.map((player, i) => {
    return { ...player, coordinates: positions[i] };
  });
}

export function convertToFieldPositionPlayers<T extends GridPlayer>(
  gridPlayers: T[]
): Array<T & { fieldPosition: FieldPosition }> {
  return gridPlayers.map(player => {
    return {
      ...player,
      fieldPosition: parseGridPosition(player.grid),
    };
  });
}

/**
 * startingPlayersからフォーメーションタイプを特定
 * @returns string（未定義の場合）
 */
export function getFormationType<T extends FieldPositionPlayer>(
  fieldPositionPlayers: T[]
): string {
  const colGroups: Record<number, number[]> = {};

  fieldPositionPlayers.forEach(player => {
    const col = player.fieldPosition.col;
    const row = player.fieldPosition.row;

    if (!colGroups[col]) colGroups[col] = [];
    colGroups[col].push(row);
  });

  const colGroupsArray = Object.values(colGroups);

  const formationType = colGroupsArray
    .map(group => group.length)
    .slice(1)
    .join('-');

  return formationType;
}
