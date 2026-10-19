import type { PlayerMaster } from '@/lib/db/schema';
import {
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_OPPONENT_SQUAD,
  DEFAULT_SEASON,
  type Season,
} from '@/lib/tactical/chelsea-preset';
import { normalizePosition } from '@/lib/tactical/player-formatting';
import { getSeasonFromDate } from '@/lib/tactical/season-utils';
import type { SupportedTeam } from '@/lib/tactical/teams-config';
import type { Match, Player, Team } from '@/types';

export interface BuildSquadParams {
  teamConfig: SupportedTeam;
  effectiveTeamName: string;
  season: string;
  matches?: Match[];
  masters?: PlayerMaster[];
  excludedPlayers?: Array<{ playerId: number }>;
}

export interface UnifiedSquadResult {
  teamPlayers: Player[];
  opponentPlayers: Player[];
  dictionary: Record<string, string>;
}

interface RawSquadPlayer {
  playerId: number;
  name: string;
  shirtNo: number;
  position?: string;
  isFirstEleven?: boolean;
}

export function matchTeamName(targetTeamName: string, name?: string): boolean {
  if (!name) return false;
  const t = targetTeamName.toLowerCase().trim();
  const n = name.toLowerCase().trim();
  return n.includes(t) || t.includes(n);
}

export function getTacticsMatchId(teamSlug: string): string {
  return `${teamSlug}-tactics-board`;
}

function createBasePlayer(
  p: RawSquadPlayer,
  field: 'home' | 'away',
  isFirstEleven = false,
): Player {
  return {
    playerId: p.playerId,
    name: p.name,
    shirtNo: p.shirtNo,
    position: normalizePosition(p.position),
    isFirstEleven,
    height: 180,
    weight: 75,
    age: 24,
    isManOfTheMatch: false,
    field,
    stats: {},
  };
}

export function buildUnifiedSquad({
  teamConfig,
  effectiveTeamName,
  season,
  matches = [],
  masters = [],
  excludedPlayers = [],
}: BuildSquadParams): UnifiedSquadResult {
  const playerMap = new Map<number, Player>();
  const opponentMap = new Map<number, Player>();
  const dict: Record<string, string> = {};
  const excludedIds = new Set<number>(excludedPlayers.map((p) => p.playerId));

  const registerPlayer = (
    targetMap: Map<number, Player>,
    p: RawSquadPlayer,
    field: 'home' | 'away',
  ) => {
    targetMap.set(p.playerId, createBasePlayer(p, field, !!p.isFirstEleven));
    dict[p.playerId] = p.name;
  };

  // 1. プリセット初期登録 (チェルシー等)
  if (teamConfig.id === 'chelsea') {
    const presetSquad =
      CHELSEA_PRESETS_BY_SEASON[season as Season] ||
      CHELSEA_PRESETS_BY_SEASON[DEFAULT_SEASON] ||
      [];
    presetSquad.forEach((p) => {
      if (!excludedIds.has(p.playerId)) registerPlayer(playerMap, p, 'home');
    });
  }

  // 2. DB Matches から該当シーズンのチーム選手を抽出して上書き/追加
  matches.forEach((m) => {
    if (getSeasonFromDate(m.date) !== season) return;
    const home = matchTeamName(
      effectiveTeamName,
      m.homeTeam?.name ?? m.teams?.home?.name,
    );
    const away = matchTeamName(
      effectiveTeamName,
      m.awayTeam?.name ?? m.teams?.away?.name,
    );
    const squad = [
      ...(home && m.teams?.home?.players
        ? (m.teams.home.players as Player[])
        : []),
      ...(away && m.teams?.away?.players
        ? (m.teams.away.players as Player[])
        : []),
    ];

    squad.forEach((p) => {
      if (!p?.playerId || excludedIds.has(p.playerId)) return;
      const existing = playerMap.get(p.playerId);
      const name = p.name || existing?.name || `Player ${p.playerId}`;
      playerMap.set(p.playerId, {
        ...p,
        name,
        shirtNo: p.shirtNo || existing?.shirtNo || 99,
        position: normalizePosition(p.position || existing?.position),
        field: 'home',
      });
      dict[p.playerId] = name;
    });
  });

  // 3. PlayerMaster の反映 (追加/更新/除外)
  masters.forEach((pm: PlayerMaster) => {
    if (!pm.playerId) return;
    if (pm.isExcluded) {
      playerMap.delete(pm.playerId);
      return;
    }
    dict[pm.playerId] = pm.name;
    const existing = playerMap.get(pm.playerId);
    if (existing) {
      playerMap.set(pm.playerId, {
        ...existing,
        name: pm.name || existing.name,
        shirtNo: pm.defaultShirtNo || existing.shirtNo,
        position: normalizePosition(pm.position || existing.position),
      });
    } else {
      registerPlayer(
        playerMap,
        {
          playerId: pm.playerId,
          name: pm.name,
          shirtNo: pm.defaultShirtNo || 99,
          position: pm.position,
        },
        'home',
      );
    }
  });

  // 4. 対戦相手（Away）スカッドの構築
  DEFAULT_OPPONENT_SQUAD.forEach((p) => {
    registerPlayer(opponentMap, p, 'away');
  });

  // 5. 同名選手の重複排除 (公式ID優先)
  const uniqueMap = new Map<string, Player>();
  playerMap.forEach((player) => {
    const cleanName = player.name.trim().toLowerCase();
    const existing = uniqueMap.get(cleanName);
    if (!existing) {
      uniqueMap.set(cleanName, player);
    } else if (existing.playerId < 0 && player.playerId > 0) {
      uniqueMap.set(cleanName, {
        ...player,
        shirtNo: existing.shirtNo || player.shirtNo,
        position: existing.position || player.position,
      });
    }
  });

  return {
    teamPlayers: Array.from(uniqueMap.values()),
    opponentPlayers: Array.from(opponentMap.values()),
    dictionary: dict,
  };
}

function createVirtualTeam(
  isHome: boolean,
  teamConfig: SupportedTeam,
  players: Player[],
): Team {
  const starters = players.slice(0, 11);
  return {
    teamId: isHome ? teamConfig.officialTeamId || 15 : 9999,
    name: isHome ? teamConfig.shortName : 'Opponent',
    countryName: isHome ? 'England' : 'Opponent',
    managerName: 'Manager',
    field: isHome ? 'home' : 'away',
    averageAge: isHome ? 24.0 : 25.0,
    players,
    formations: [
      {
        formationId: 2,
        formationName: '4-2-3-1',
        captainPlayerId: isHome ? players[0]?.playerId || 0 : 999001,
        startMinuteExpanded: 0,
        endMinuteExpanded: 90,
        playerIds: starters.map((p) => p.playerId),
        jerseyNumbers: starters.map((p) => p.shirtNo),
      },
    ],
    stats: {},
  };
}

export function buildVirtualMatch(
  teamConfig: SupportedTeam,
  teamPlayers: Player[],
  opponentPlayers: Player[],
  dictionary: Record<string, string>,
): Match {
  return {
    id: getTacticsMatchId(teamConfig.id),
    date: new Date().toISOString(),
    score: '0 - 0',
    matchType: 'club',
    homeTeam: {
      id: teamConfig.officialTeamId || 15,
      name: teamConfig.shortName,
    },
    awayTeam: { id: 9999, name: 'Opponent' },
    playerIdNameDictionary: dictionary,
    teams: {
      home: createVirtualTeam(true, teamConfig, teamPlayers),
      away: createVirtualTeam(false, teamConfig, opponentPlayers),
    },
  };
}
