import {
  FORMATION_LIST,
  type FormationType,
  getFormationActualPos,
} from './formations';
import { FORMATION_POSITIONS } from './formations-data';

/**
 * WhoScored のフォーメーション名 (例: "4231", "4-2-3-1", "433", "352") を
 * アプリの FormationType (例: "4-2-3-1", "4-3-3") に正規化する
 */
export function parseWhoScoredFormationName(
  formationName?: string,
): FormationType {
  if (!formationName) return '4-4-2';

  const clean = formationName.trim();
  if ((FORMATION_LIST as readonly string[]).includes(clean)) {
    return clean as FormationType;
  }

  // ハイフンが含まれていない数字列の場合の分解マップ (例: "4231" -> "4-2-3-1")
  const digits = clean.replace(/\D/g, '');
  const patternMap: Record<string, FormationType> = {
    '4231': '4-2-3-1',
    '433': '4-3-3',
    '442': '4-4-2',
    '352': '3-5-2',
    '3421': '3-4-2-1',
    '3412': '3-4-1-2',
    '3142': '3-1-4-2',
    '3511': '3-5-1-1',
    '334': '3-3-4',
    '3313': '3-3-1-3',
    '3331': '3-3-3-1',
    '3241': '3-2-4-1',
    '4141': '4-1-4-1',
    '4312': '4-3-1-2',
    '4411': '4-4-1-1',
    '451': '4-5-1',
    '4222': '4-2-2-2',
    '4321': '4-3-2-1',
    '4132': '4-1-3-2',
    '4123': '4-1-2-3',
    '424': '4-2-4',
    '4213': '4-2-1-3',
    '532': '5-3-2',
    '541': '5-4-1',
    '523': '5-2-3',
    '5221': '5-2-2-1',
    '2341': '2-3-4-1',
  };

  if (patternMap[digits]) {
    return patternMap[digits];
  }

  return '4-4-2';
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
export function sortPlayersBy2DPositionGroup(players: any[]): any[] {
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
 * 4-4-2 の標準的な XY 座標マッピング
 * 常に「ホーム視点（Normal）」を基準とした 0-100 の絶対座標系
 */
export const DEFAULT_442_POSITIONS: Record<
  'home' | 'away',
  { x: number; y: number }[]
> = {
  home: FORMATION_POSITIONS['4-4-2'].map((pos) =>
    getFormationActualPos(pos, 'home', 'half'),
  ),
  away: FORMATION_POSITIONS['4-4-2'].map((pos) =>
    getFormationActualPos(pos, 'away', 'half'),
  ),
};

/**
 * ベンチ選手の配置用定数
 */
export const BENCH_CONFIG = {
  COLS: 3,
  X_START: 15,
  X_STEP: 35,
  Y_START: 10,
  Y_STEP: 15,
} as const;

/**
 * ベンチのインデックスからXY座標を計算する
 */
export function getBenchPos(index: number): { x: number; y: number } {
  const { COLS, X_START, X_STEP, Y_START, Y_STEP } = BENCH_CONFIG;
  return {
    x: X_START + (index % COLS) * X_STEP,
    y: Y_START + Math.floor(index / COLS) * Y_STEP,
  };
}

/**
 * 特定の分における出場選手を特定する (National Data)
 */
export function getActivePlayersNational(matchData: any, minute: number) {
  const { homeStarters, awayStarters, homeBench, awayBench } =
    matchData.lineups;

  const getTeamActive = (starters: any[], _bench: any[]) => {
    const activeIds = new Set(starters.map((p: any) => p.playerId));

    // 交代履歴をスキャン (timeline)
    matchData.timeline.forEach((period: any) => {
      const eventMinute = period[0];
      if (eventMinute > minute) return;

      const homeEvents = period[1] || [];
      const awayEvents = period[2] || [];
      const events = [...homeEvents, ...awayEvents];

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
export function getActivePlayersClub(matchCentreData: any, minute: number) {
  const getTeamActive = (team: any) => {
    const starters = team.players
      .filter((p: any) => p.isFirstEleven)
      .map((p: any) => p.playerId);
    const activeIds = new Set<number>(starters);

    // 交代履歴をスキャン (incidentEvents)
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
 * 選手オブジェクトから背番号を取得する
 * 各種データソース(Club, National, Store)の差異を吸収する
 */
export function getShirtNo(player: any): string {
  if (!player) return '';
  return (
    player.shirtNo?.toString() ||
    player.number?.toString() ||
    player.jerseyNumber?.toString() ||
    ''
  );
}

/**
 * メタデータから初期の選手配置マッピングを生成する
 */
export function generateInitialMapping(metadata: any): Record<number, any> {
  const initialMapping: Record<number, any> = {};

  const setupTeam = (team: 'home' | 'away') => {
    const teamData = metadata?.teams?.[team];
    const players: any[] = teamData?.players || [];
    if (players.length === 0) return false;

    const formations: any[] = teamData?.formations || [];
    const primaryFormation = formations[0];

    let pitchPlayers: any[] = [];
    let benchPlayers: any[] = [];

    const rawPositions: any[] = primaryFormation?.formationPositions || [];
    const playerIds: number[] = primaryFormation?.playerIds || [];

    // 1. クラブデータ等で formationPositions (vertical/horizontal) と playerIds が揃っている場合
    if (playerIds.length >= 11 && rawPositions.length >= 11) {
      const starterIdSet = new Set<number>(playerIds.slice(0, 11));
      const startersByIdMap = new Map<number, any>();
      players.forEach((p) => startersByIdMap.set(p.playerId, p));

      const starterItems: Array<{
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
      const startersByIdMap = new Map<number, any>();
      players.forEach((p) => startersByIdMap.set(p.playerId, p));

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
      const actualPos = getFormationActualPos(posTemplate, team, 'half');

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

/**
 * ホーム視点（Normal）の座標を、現在の表示モードに合わせて変換する
 * isFlipped が真なら 180度回転 (100 - x, 100 - y) を適用
 */
export function toViewPos(
  actual: { x: number; y: number },
  isFlipped: boolean,
): { x: number; y: number } {
  if (!isFlipped) return actual;
  return {
    x: 100 - actual.x,
    y: 100 - actual.y,
  };
}

/**
 * 表示上の座標（マウス位置等）を、保存用のホーム視点（Normal）データに変換する
 * 計算式は toViewPos と同じ（180度回転は可逆的なため）
 */
export function toActualPos(
  view: { x: number; y: number },
  isFlipped: boolean,
): { x: number; y: number } {
  return toViewPos(view, isFlipped);
}
