import {
  getFormationActualPos,
  getFormationActualPosVertical,
} from '../data/formations';
import { FORMATION_POSITIONS } from '../data/formations-data';
import { getBenchPos } from './coordinates';
import { parseWhoScoredFormationName } from './formations';
import {
  getShirtNo,
  normalizePosition,
  sortPlayersBy2DPositionGroup,
} from './player-formatting';

/**
 * 特定の分における出場選手を特定する (National Data)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getActivePlayersNational(matchData: any, minute: number) {
  const { homeStarters, awayStarters, homeBench, awayBench } =
    matchData.lineups;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTeamActive = (starters: any[], _bench: any[]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeIds = new Set(starters.map((p: any) => p.playerId));

    // 交代履歴をスキャン (timeline)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matchData.timeline.forEach((period: any) => {
      const eventMinute = period[0];
      if (eventMinute > minute) return;

      const homeEvents = period[1] || [];
      const awayEvents = period[2] || [];
      const events = [...homeEvents, ...awayEvents];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      events.forEach((ev: any) => {
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getActivePlayersClub(matchCentreData: any, minute: number) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getTeamActive = (team: any) => {
    const starters = team.players
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.isFirstEleven)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => p.playerId);
    const activeIds = new Set<number>(starters);

    // 交代履歴をスキャン (incidentEvents)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    team.incidentEvents?.forEach((ev: any) => {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any,
  orientation: 'vertical' | 'horizontal' = 'vertical',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<number, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initialMapping: Record<number, any> = {};

  const setupTeam = (team: 'home' | 'away') => {
    const teamData = metadata?.teams?.[team];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const players: any[] = teamData?.players || [];
    if (players.length === 0) return false;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formations: any[] = teamData?.formations || [];
    const primaryFormation = formations[0];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pitchPlayers: any[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let benchPlayers: any[] = [];

    const playerIds: number[] = primaryFormation?.playerIds || [];

    // 1. 先発11名とベンチ選手を分離
    if (playerIds.length >= 11) {
      const starterIdSet = new Set<number>(playerIds.slice(0, 11));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startersByIdMap = new Map<number, any>();
      players.forEach((p) => {
        startersByIdMap.set(p.playerId, p);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawStarters: any[] = [];
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rawStarters: any[] = [];
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
