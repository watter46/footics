import type { PlayerMaster } from '@/lib/db/schema';
import type { Player } from '@/types';
import type { MergedSquadPlayer } from '../components/squad-player-card';
import type { PositionCategory } from '../components/squad-stats-summary';
import type {
  IdFilterOption,
  OfficialPlayerOption,
} from '../types/squad-client';

export const POSITION_CATEGORIES: PositionCategory[] = [
  { key: 'GK', label: 'Goalkeepers', positions: ['GK'] },
  { key: 'DF', label: 'Defenders', positions: ['DF', 'DR', 'DC', 'DL'] },
  {
    key: 'MID',
    label: 'Midfielders',
    positions: ['MID', 'DMC', 'MC', 'AMC', 'AMR', 'AML'],
  },
  { key: 'FW', label: 'Forwards', positions: ['FW'] },
  { key: 'Other', label: 'Others', positions: ['Other', 'Sub'] },
];

/**
 * 重複する同一選手名レコードを統合（公式ID優先・手動メタデータ引き継ぎ）
 */
function resolvePlayerConflict(
  existing: MergedSquadPlayer,
  incoming: MergedSquadPlayer,
): MergedSquadPlayer {
  if (existing.playerId < 0 && incoming.playerId > 0) {
    return {
      ...incoming,
      shirtNo: existing.shirtNo || incoming.shirtNo,
      photoBlob: existing.photoBlob || incoming.photoBlob,
      photoUrl: existing.photoUrl || incoming.photoUrl,
      position: existing.position || incoming.position,
    };
  }
  if (existing.playerId > 0 && incoming.playerId < 0) {
    return {
      ...existing,
      photoBlob: incoming.photoBlob || existing.photoBlob,
      photoUrl: incoming.photoUrl || existing.photoUrl,
    };
  }
  return existing;
}

/**
 * マスタ選手情報とスカッド情報を統合したリストを作成 (重複排除・ユニーク化)
 */
export function mergeMasterAndSquadPlayers(
  teamPlayers: Player[],
  masterPlayers: PlayerMaster[],
): MergedSquadPlayer[] {
  const masterMap = new Map<number, PlayerMaster>();
  masterPlayers.forEach((pm) => {
    masterMap.set(pm.playerId, pm);
  });

  const list: MergedSquadPlayer[] = teamPlayers.map((p) => {
    const pm = masterMap.get(p.playerId);
    return {
      ...p,
      name: pm?.name || p.name,
      shirtNo: pm?.defaultShirtNo || p.shirtNo,
      position: (pm?.position as typeof p.position) || p.position,
      photoBlob: pm?.photoBlob,
      photoUrl: pm?.photoUrl,
    };
  });

  const uniqueMap = new Map<string, MergedSquadPlayer>();
  list.forEach((p) => {
    const cleanName = p.name.trim().toLowerCase();
    const existing = uniqueMap.get(cleanName);
    uniqueMap.set(cleanName, existing ? resolvePlayerConflict(existing, p) : p);
  });

  return Array.from(uniqueMap.values());
}

/**
 * 選手リストをポジションカテゴリ別に分類し、背番号順にソート
 */
export function groupPlayersByCategory(
  players: MergedSquadPlayer[],
  categories: readonly PositionCategory[],
): Record<string, MergedSquadPlayer[]> {
  const map: Record<string, MergedSquadPlayer[]> = {};
  categories.forEach((cat) => {
    map[cat.key] = [];
  });

  players.forEach((p) => {
    const cat = categories.find((c) => c.positions.includes(p.position));
    if (cat) {
      map[cat.key].push(p);
    } else {
      if (!map.Other) map.Other = [];
      map.Other.push(p);
    }
  });

  // 背番号順にソート
  Object.keys(map).forEach((k) => {
    map[k].sort((a, b) => (a.shirtNo || 99) - (b.shirtNo || 99));
  });

  return map;
}

export interface SquadViewData {
  filteredPlayers: MergedSquadPlayer[];
  playersByCategory: Record<string, MergedSquadPlayer[]>;
  officialCount: number;
  manualCount: number;
  availableOfficialPlayers: OfficialPlayerOption[];
  currentSeasonPlayerIds: Set<number>;
}

/**
 * フィルター・カテゴリ・統計などの導出ビューデータを算出
 */
export function computeSquadViewData(
  mergedPlayers: MergedSquadPlayer[],
  idFilter: IdFilterOption,
): SquadViewData {
  const filteredPlayers =
    idFilter === 'official'
      ? mergedPlayers.filter((p) => p.playerId > 0)
      : idFilter === 'manual'
        ? mergedPlayers.filter((p) => p.playerId < 0)
        : mergedPlayers;

  return {
    filteredPlayers,
    officialCount: mergedPlayers.filter((p) => p.playerId > 0).length,
    manualCount: mergedPlayers.filter((p) => p.playerId < 0).length,
    playersByCategory: groupPlayersByCategory(
      filteredPlayers,
      POSITION_CATEGORIES,
    ),
    availableOfficialPlayers: mergedPlayers
      .filter((p) => p.playerId > 0)
      .map((p) => ({ playerId: p.playerId, name: p.name, shirtNo: p.shirtNo })),
    currentSeasonPlayerIds: new Set(mergedPlayers.map((p) => p.playerId)),
  };
}
