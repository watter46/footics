import type { ClubMatchRoot, Formation, Player, Team } from '@/types';

export interface TeamFormationResult {
  teamId: number;
  teamName: string;
  field: 'home' | 'away';
  formation: Formation | null;
  formationName: string | null;
  playerIds: number[];
  players: Player[];
  captainPlayerId: number | null;
}

export interface MatchFormationResult {
  minute: number;
  home: TeamFormationResult;
  away: TeamFormationResult;
}

/**
 * フォーメーション配列から指定した分数（minute / expandedMinute）において有効なフォーメーションを取得する。
 *
 * 判定ロジック:
 * 1. フォーメーションが空の場合は null を返す。
 * 2. startMinuteExpanded 昇順でソート。
 * 3. minute < 最初フォーメーションの開始分の場合は最初のフォーメーションを返す。
 * 4. minute >= 最後フォーメーションの開始分の場合は最後のフォーメーションを返す。
 * 5. それ以外は、startMinuteExpanded <= minute を満たす最新のフォーメーションを返す。
 */
export function findFormationAtMinute(
  formations: Formation[] | undefined | null,
  minute: number,
): Formation | null {
  if (!formations || formations.length === 0) {
    return null;
  }

  // startMinuteExpanded 昇順でソート
  const sorted = [...formations].sort(
    (a, b) => a.startMinuteExpanded - b.startMinuteExpanded,
  );

  // 指定分より前の場合は最初のフォーメーション
  if (minute < sorted[0].startMinuteExpanded) {
    return sorted[0];
  }

  // 指定分以降で最新の開始分を持つフォーメーションを検索
  for (let i = sorted.length - 1; i >= 0; i--) {
    const f = sorted[i];
    if (minute >= f.startMinuteExpanded) {
      return f;
    }
  }

  return sorted[0];
}

/**
 * フォーメーションの playerIds に対応する Player オブジェクトの配列を取得する。
 */
export function getPlayersForFormation(
  formation: Formation | null,
  allPlayers: Player[] | undefined | null,
): Player[] {
  if (!formation?.playerIds || !allPlayers) {
    return [];
  }

  const playerMap = new Map<number, Player>();
  for (const player of allPlayers) {
    playerMap.set(player.playerId, player);
  }

  return formation.playerIds
    .map((id) => playerMap.get(id))
    .filter((player): player is Player => Boolean(player));
}

/**
 * 単一チームの指定分数におけるフォーメーションとピッチ上選手情報を取得する。
 */
export function getTeamFormationAtMinute(
  team: Team | undefined | null,
  minute: number,
): TeamFormationResult {
  if (!team) {
    return {
      teamId: 0,
      teamName: '',
      field: 'home',
      formation: null,
      formationName: null,
      playerIds: [],
      players: [],
      captainPlayerId: null,
    };
  }

  const formation = findFormationAtMinute(team.formations, minute);
  const players = getPlayersForFormation(formation, team.players);

  return {
    teamId: team.teamId,
    teamName: team.name,
    field: team.field,
    formation,
    formationName: formation?.formationName ?? null,
    playerIds: formation?.playerIds ?? [],
    players,
    captainPlayerId: formation?.captainPlayerId ?? null,
  };
}

/**
 * 試合データ (ClubMatchRoot) と指定分数から、ホーム・アウェイ両チームの有効フォーメーションおよびピッチ上選手を取得する。
 */
export function getFormationAndPlayersAtMinute(
  matchData: ClubMatchRoot,
  minute: number,
): MatchFormationResult {
  const homeTeam = matchData?.matchCentreData?.home;
  const awayTeam = matchData?.matchCentreData?.away;

  return {
    minute,
    home: getTeamFormationAtMinute(homeTeam, minute),
    away: getTeamFormationAtMinute(awayTeam, minute),
  };
}
