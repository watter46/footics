import type { ClubMatchRoot, Formation, Player, Team } from '@/types';

export interface SlotPositionInfo {
  slot: number;
  vertical: number;
  horizontal: number;
}

export interface TeamFormationResult {
  teamId: number;
  teamName: string;
  field: 'home' | 'away';
  formation: Formation | null;
  formationName: string | null;
  playerIds: number[]; // ピッチ上の選手IDのみ (slot 1..11)
  players: Player[]; // ピッチ上の選手のみ
  benchPlayerIds: number[]; // 未出場控え(slot===0) + 交代退場済み選手ID
  benchPlayers: Player[]; // 未出場控え(先頭) + 交代退場済み選手(後ろ)
  slotPositions: Record<number, SlotPositionInfo>; // key: playerId
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
 * 単一チームの指定分数におけるフォーメーションとピッチ上選手・控え選手情報を取得する。
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
      benchPlayerIds: [],
      benchPlayers: [],
      slotPositions: {},
      captainPlayerId: null,
    };
  }

  const formation = findFormationAtMinute(team.formations, minute);
  const playerMap = new Map<number, Player>();
  for (const player of team.players || []) {
    playerMap.set(player.playerId, player);
  }

  const pitchPlayerIds: number[] = [];
  const unplayedSubIds: number[] = [];
  const slotPositions: Record<number, SlotPositionInfo> = {};

  if (formation?.playerIds) {
    const hasSlots =
      Array.isArray(formation.formationSlots) &&
      formation.formationSlots.length > 0;

    formation.playerIds.forEach((pId, idx) => {
      const slot = hasSlots
        ? formation.formationSlots![idx]
        : idx < 11
          ? idx + 1
          : 0;
      const pos =
        formation.formationPositions?.[idx] ??
        (slot >= 1 && slot <= 11
          ? formation.formationPositions?.[slot - 1]
          : undefined);

      if (slot >= 1 && slot <= 11) {
        pitchPlayerIds.push(pId);
        slotPositions[pId] = {
          slot,
          vertical: pos?.vertical ?? 0,
          horizontal: pos?.horizontal ?? 0,
        };
      } else if (slot === 0) {
        unplayedSubIds.push(pId);
      }
    });
  }

  // 交代退場済み選手: team.players に存在するが、ピッチ上選手にも未出場控えにも含まれない選手（重複排除）
  const activeAndSubIdsSet = new Set([...pitchPlayerIds, ...unplayedSubIds]);
  const subbedOutIds: number[] = [];
  for (const p of team.players || []) {
    if (!activeAndSubIdsSet.has(p.playerId)) {
      subbedOutIds.push(p.playerId);
      activeAndSubIdsSet.add(p.playerId);
    }
  }

  const benchPlayerIds = [...unplayedSubIds, ...subbedOutIds];

  const pitchPlayers = pitchPlayerIds
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  const benchPlayers = benchPlayerIds
    .map((id) => playerMap.get(id))
    .filter((p): p is Player => Boolean(p));

  return {
    teamId: team.teamId,
    teamName: team.name,
    field: team.field,
    formation,
    formationName: formation?.formationName ?? null,
    playerIds: pitchPlayerIds,
    players: pitchPlayers,
    benchPlayerIds,
    benchPlayers,
    slotPositions,
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
