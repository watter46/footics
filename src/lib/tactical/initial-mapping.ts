import {
  getFormationActualPos,
  getFormationActualPosVertical,
} from '../data/formations';
import { FORMATION_POSITIONS } from '../data/formations-data';
import { getBenchPos } from './coordinates';
import { parseWhoScoredFormationName } from './formations';
import { getShirtNo, sortPlayersBy2DPositionGroup } from './player-formatting';

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
          // National形式では ev[6] が退く選手、ev[7] が入る選手
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
    team.incidentEvents.forEach((ev: any) => {
      if (ev.minute > minute) return;

      if (ev.type.displayName === 'SubstitutionOff') {
        activeIds.delete(ev.playerId);
      } else if (ev.type.displayName === 'SubstitutionOn') {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawPositions: any[] = primaryFormation?.formationPositions || [];
    const playerIds: number[] = primaryFormation?.playerIds || [];

    // 1. クラブデータ等で formationPositions (vertical/horizontal) と playerIds が揃っている場合
    if (playerIds.length >= 11 && rawPositions.length >= 11) {
      const starterIdSet = new Set<number>(playerIds.slice(0, 11));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const startersByIdMap = new Map<number, any>();
      players.forEach((p) => {
        startersByIdMap.set(p.playerId, p);
      });

      const starterItems: Array<{
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        player: any;
        vertical: number;
        horizontal: number;
      }> = [];

      playerIds.slice(0, 11).forEach((id: number, idx: number) => {
        const found = startersByIdMap.get(id);
        const posInfo = rawPositions[idx] || { vertical: 0, horizontal: 0 };
        if (found) {
          starterItems.push({
            player: found,
            vertical: posInfo.vertical ?? 0,
            horizontal: posInfo.horizontal ?? 0,
          });
        }
      });

      // 縦 (vertical) 昇順、同一縦内では横 (horizontal) 降順 (9=左端 -> 1=右端) でソート
      starterItems.sort((a, b) => {
        if (a.vertical !== b.vertical) return a.vertical - b.vertical;
        return b.horizontal - a.horizontal;
      });

      pitchPlayers = starterItems.map((item) => item.player);
      benchPlayers = players.filter((p) => !starterIdSet.has(p.playerId));
    } else if (playerIds.length >= 11) {
      // playerIds のみある場合
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
      // 代表データやフォールバック: isFirstEleven 判定
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

    // 2. フォーメーション名から FormationType を特定
    const formationType = parseWhoScoredFormationName(
      primaryFormation?.formationName,
    );

    // テンプレート位置スロットを top 昇順 (GK->FW), topが近い場合は left 昇順 (左->右) で整列
    const rawPositionsList = [
      ...(FORMATION_POSITIONS[formationType] || FORMATION_POSITIONS['4-4-2']),
    ];
    const sortedSlots = rawPositionsList.sort((a, b) => {
      const topDiff = Math.abs(a.top - b.top);
      if (topDiff > 5) {
        return b.top - a.top; // top は 90(GK) -> 25(FW) なので降順が GK->FW
      }
      return a.left - b.left; // 横方向は左(10) -> 右(90)
    });

    // ピッチ選手の配置設定
    pitchPlayers.forEach((p, i) => {
      const posTemplate = sortedSlots[i] || sortedSlots[0];
      const actualPos =
        orientation === 'vertical'
          ? getFormationActualPosVertical(posTemplate, team, 'half')
          : getFormationActualPos(posTemplate, team, 'half');

      initialMapping[p.playerId] = {
        playerId: p.playerId,
        shirtNo: getShirtNo(p),
        x: actualPos.x,
        y: actualPos.y,
        team,
        area: 'pitch',
      };
    });

    // ベンチ選手の配置設定
    benchPlayers.forEach((p, i) => {
      const benchPos = getBenchPos(i);
      initialMapping[p.playerId] = {
        playerId: p.playerId,
        shirtNo: getShirtNo(p),
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
