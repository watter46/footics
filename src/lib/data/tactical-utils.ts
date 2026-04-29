import { getFormationActualPos } from './formations';
import { FORMATION_POSITIONS } from './formations-data';

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

  const getTeamActive = (starters: any[], bench: any[]) => {
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
    const players = metadata?.teams[team]?.players || [];
    if (players.length === 0) return false;

    players.forEach((p: any, i: number) => {
      let x: number;
      let y: number;
      let area: 'pitch' | 'bench';

      if (i < 11) {
        area = 'pitch';
        x = DEFAULT_442_POSITIONS[team][i]?.x || (team === 'home' ? 10 : 90);
        y = DEFAULT_442_POSITIONS[team][i]?.y || 10 + i * 8;
      } else {
        area = 'bench';
        const pos = getBenchPos(i - 11);
        x = pos.x;
        y = pos.y;
      }

      initialMapping[p.playerId] = {
        playerId: p.playerId,
        shirtNo: getShirtNo(p),
        x,
        y,
        team,
        area,
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
