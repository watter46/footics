import {
  getFormationActualPos,
  getFormationActualPosVertical,
} from '../data/formations';
import { FORMATION_POSITIONS } from '../data/formations-data';
import type {
  FormattedMatchData,
  FormattedPlayer,
} from '../national-match-schema';
import { getBenchPos } from './coordinates';
import { parseWhoScoredFormationName } from './formations';
import { getShirtNo, sortPlayersBy2DPositionGroup } from './player-formatting';

export interface InitialPlayerMapping {
  playerId: number;
  name: string;
  shirtNo: string;
  position: string;
  x: number;
  y: number;
  team: 'home' | 'away';
  area: 'pitch' | 'bench';
}

export interface ClubPlayerLike {
  playerId: number;
  name?: string;
  isFirstEleven?: boolean;
  shirtNo?: string | number;
  position?: string;
  [key: string]: unknown;
}

export interface ClubIncidentEventLike {
  minute: number;
  type?: {
    displayName?: string;
  };
  playerId: number;
  [key: string]: unknown;
}

export interface ClubTeamLike {
  players: ClubPlayerLike[];
  incidentEvents?: ClubIncidentEventLike[];
  [key: string]: unknown;
}

export interface ClubMatchCentreDataLike {
  home: ClubTeamLike;
  away: ClubTeamLike;
  [key: string]: unknown;
}

export interface InitialMappingPlayerLike {
  playerId: number;
  name: string;
  shirtNo?: string | number;
  number?: string | number;
  jerseyNumber?: string | number;
  position?: string;
  isFirstEleven?: boolean;
  [key: string]: unknown;
}

export interface InitialMappingFormationLike {
  formationName?: string;
  playerIds?: number[];
  [key: string]: unknown;
}

export interface InitialMappingTeamLike {
  name?: string;
  players?: InitialMappingPlayerLike[];
  formations?: InitialMappingFormationLike[];
  [key: string]: unknown;
}

export interface InitialMappingMetadata {
  teams?: {
    home?: InitialMappingTeamLike;
    away?: InitialMappingTeamLike;
  };
  [key: string]: unknown;
}

/**
 * 特定の分における出場選手を特定する (National Data)
 */
export function getActivePlayersNational(
  matchData: FormattedMatchData,
  minute: number,
): { homeActiveIds: number[]; awayActiveIds: number[] } {
  const { homeStarters, awayStarters, homeBench, awayBench } =
    matchData.lineups;

  const getTeamActive = (
    starters: FormattedPlayer[],
    _bench: FormattedPlayer[],
  ): number[] => {
    const activeIds = new Set<number>(starters.map((p) => p.playerId));

    // 交代履歴をスキャン (timeline)
    matchData.timeline.forEach((period) => {
      const eventMinute = period[0];
      if (eventMinute > minute) return;

      const homeEvents = period[1] || [];
      const awayEvents = period[2] || [];
      const events = [...homeEvents, ...awayEvents];

      events.forEach((ev) => {
        const eventType = ev[2];
        const player1Id = ev[6];
        const player2Id = ev[7];

        if (eventType === 'subst') {
          if (activeIds.has(player1Id)) {
            activeIds.delete(player1Id);
            activeIds.add(player2Id);
          }
        }
      });
    });

    return Array.from(activeIds);
  };

  const homeActiveIds = getTeamActive(homeStarters, homeBench);
  const awayActiveIds = getTeamActive(awayStarters, awayBench);

  return { homeActiveIds, awayActiveIds };
}

/**
 * 特定の分における出場選手を特定する (Club Data)
 */
export function getActivePlayersClub(
  matchCentreData: ClubMatchCentreDataLike,
  minute: number,
): { homeActiveIds: number[]; awayActiveIds: number[] } {
  const getTeamActive = (team: ClubTeamLike): number[] => {
    const starters = team.players
      .filter((p) => p.isFirstEleven)
      .map((p) => p.playerId);
    const activeIds = new Set<number>(starters);

    // 交代履歴をスキャン (incidentEvents)
    team.incidentEvents?.forEach((ev) => {
      if (ev.minute > minute) return;

      if (ev.type?.displayName === 'SubstitutionOff') {
        activeIds.delete(ev.playerId);
      } else if (ev.type?.displayName === 'SubstitutionOn') {
        activeIds.add(ev.playerId);
      }
    });

    return Array.from(activeIds);
  };

  const homeActiveIds = getTeamActive(matchCentreData.home);
  const awayActiveIds = getTeamActive(matchCentreData.away);

  return { homeActiveIds, awayActiveIds };
}

/**
 * メタデータから初期の選手配置マッピングを生成する (縦画面 / 横画面両対応)
 */
export function generateInitialMapping(
  metadata: InitialMappingMetadata,
  orientation: 'vertical' | 'horizontal' = 'vertical',
): Record<number, InitialPlayerMapping> {
  const initialMapping: Record<number, InitialPlayerMapping> = {};

  const setupTeam = (team: 'home' | 'away'): boolean => {
    const teamData = metadata?.teams?.[team];
    const players: InitialMappingPlayerLike[] = teamData?.players || [];
    if (players.length === 0) return false;

    const formations: InitialMappingFormationLike[] =
      teamData?.formations || [];
    const primaryFormation = formations[0];

    let pitchPlayers: InitialMappingPlayerLike[] = [];
    let benchPlayers: InitialMappingPlayerLike[] = [];

    const playerIds: number[] = primaryFormation?.playerIds || [];

    // 1. 先発11名とベンチ選手を分離
    if (playerIds.length >= 11) {
      const starterIdSet = new Set<number>(playerIds.slice(0, 11));
      const startersByIdMap = new Map<number, InitialMappingPlayerLike>();
      players.forEach((p) => {
        startersByIdMap.set(p.playerId, p);
      });

      const rawStarters: InitialMappingPlayerLike[] = [];
      playerIds.slice(0, 11).forEach((id: number) => {
        const found = startersByIdMap.get(id);
        if (found) rawStarters.push(found);
      });

      pitchPlayers = sortPlayersBy2DPositionGroup(rawStarters);
      benchPlayers = players.filter((p) => !starterIdSet.has(p.playerId));
    } else {
      // フォールバック: isFirstEleven 判定
      const starters = players.filter((p) => p.isFirstEleven);
      const nonStarters = players.filter((p) => !p.isFirstEleven);

      let rawStarters: InitialMappingPlayerLike[] = [];
      if (starters.length >= 11) {
        rawStarters = starters.slice(0, 11);
        benchPlayers = [...starters.slice(11), ...nonStarters];
      } else {
        rawStarters = [
          ...starters,
          ...nonStarters.slice(0, 11 - starters.length),
        ];
        const pitchSet = new Set(rawStarters.map((p) => p.playerId));
        benchPlayers = players.filter((p) => !pitchSet.has(p.playerId));
      }

      pitchPlayers = sortPlayersBy2DPositionGroup(rawStarters);
    }

    // 2. フォーメーション名から FormationType を特定 (Chelsea の場合は 3-4-3 を優先)
    const isChelsea = teamData?.name?.toLowerCase().includes('chelsea');
    const formationType = primaryFormation?.formationName
      ? parseWhoScoredFormationName(primaryFormation.formationName)
      : isChelsea
        ? '3-4-3'
        : '4-4-2';

    // FORMATION_POSITIONS はすでに GK(0) -> DF -> MF -> FW の順序で定義されている
    const templatePositions =
      FORMATION_POSITIONS[formationType] ||
      FORMATION_POSITIONS['3-4-3'] ||
      FORMATION_POSITIONS['4-4-2'];

    // ピッチ選手の配置設定 (11ポジションに順次割り当て)
    pitchPlayers.forEach((p, i) => {
      const posTemplate = templatePositions[i] || templatePositions[0];
      const actualPos =
        orientation === 'vertical'
          ? getFormationActualPosVertical(posTemplate, team, 'half')
          : getFormationActualPos(posTemplate, team, 'half');

      initialMapping[p.playerId] = {
        playerId: p.playerId,
        name: p.name,
        shirtNo: getShirtNo(p),
        position: p.position || '',
        x: actualPos.x,
        y: actualPos.y,
        team,
        area: 'pitch',
      };
    });

    // 3. ベンチ選手をポジション順 (GK -> DF -> MF -> FW) にソートして配置
    const sortedBench = sortPlayersBy2DPositionGroup(benchPlayers);
    sortedBench.forEach((p, i) => {
      const benchPos = getBenchPos(i);
      initialMapping[p.playerId] = {
        playerId: p.playerId,
        name: p.name,
        shirtNo: getShirtNo(p),
        position: p.position || '',
        x: benchPos.x,
        y: benchPos.y,
        team,
        area: 'bench',
      };
    });

    return true;
  };

  const homeSuccess = setupTeam('home');
  const awaySuccess = setupTeam('away');

  if (!homeSuccess && !awaySuccess) return {};
  return initialMapping;
}
