import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { usePlayerRepository } from '@/features/players/hooks/usePlayerRepository';
import { useTeamRepository } from '@/features/match/hooks/useTeamRepository';
import type { IMatch, Player } from '@/lib/db';
import type { FormationType } from '@/lib/formation-template';
import type { FormationPlayers } from '@/types/formation';
import {
  normalizeAssignedPlayers,
  createResolvedPlayers,
  type AssignedPlayersMap,
} from '@/features/match/utils/assignedPlayers';

const DEFAULT_FORMATION: FormationType = '4-2-3-1';

export interface MatchDetailState {
  match: IMatch | null;
  currentFormation: FormationType;
  assignedPlayersMap: AssignedPlayersMap;
  resolvedPlayers: FormationPlayers;
  resolvedSubstitutedOutPlayers: Player[];
  teamNameById: Map<number, string>;
  formattedDate: string;
  isLoading: boolean;
  notFound: boolean;
}

const EMPTY_STATE: MatchDetailState = {
  match: null,
  currentFormation: DEFAULT_FORMATION,
  assignedPlayersMap: {},
  resolvedPlayers: {},
  resolvedSubstitutedOutPlayers: [],
  teamNameById: new Map(),
  formattedDate: '',
  isLoading: true,
  notFound: false,
};

export const useMatchDetailLogic = (matchId: number): MatchDetailState => {
  const { useMatchById } = useMatchRepository();
  const { getPlayersByIds } = usePlayerRepository();
  const { useTeamsByIds } = useTeamRepository();

  const match = useMatchById(matchId);

  // Derived state from match
  const matchData = useMemo(() => {
    if (!match) return null;
    return typeof match.subjectTeamId === 'number'
      ? match
      : { ...match, subjectTeamId: match.team1Id };
  }, [match]);

  // Fetch related players
  const playerIds = useMemo(() => {
    if (!matchData) return [];
    const assigned = normalizeAssignedPlayers(matchData.assignedPlayers);
    const assignedIds = Object.values(assigned);
    const substitutedIds = matchData.substitutedOutPlayerIds ?? [];
    return Array.from(new Set([...assignedIds, ...substitutedIds]));
  }, [matchData]);

  const players = useLiveQuery(async () => {
    if (playerIds.length === 0) return [];
    return getPlayersByIds(playerIds);
  }, [playerIds]);

  // Fetch related teams
  const teamIds = useMemo(() => {
    if (!matchData) return [];
    return [matchData.team1Id, matchData.team2Id].filter((id): id is number => typeof id === 'number');
  }, [matchData]);

  const teams = useTeamsByIds(teamIds);

  // Combine everything
  const state = useMemo((): MatchDetailState => {
    const isMatchLoading = match === undefined;
    const isPlayersLoading = players === undefined && playerIds.length > 0;
    const isTeamsLoading = teams === undefined && teamIds.length > 0;

    if (isMatchLoading || isPlayersLoading || isTeamsLoading) {
      return { ...EMPTY_STATE, isLoading: true };
    }

    if (!matchData) {
      return { ...EMPTY_STATE, isLoading: false, notFound: true };
    }

    const assignedPlayersMap = normalizeAssignedPlayers(matchData.assignedPlayers);

    const playersMap = new Map<number, Player>();
    players?.forEach(p => {
      if (typeof p.id === 'number') {
        playersMap.set(p.id, p);
      }
    });

    const resolvedPlayers = createResolvedPlayers(assignedPlayersMap, playersMap);

    const resolvedSubstitutedOutPlayers = (matchData.substitutedOutPlayerIds ?? [])
      .map(id => playersMap.get(id))
      .filter((p): p is Player => !!p);

    const teamNameById = new Map<number, string>();
    teams?.forEach(t => {
        if (t.id) teamNameById.set(t.id, t.name);
    });

    const formattedDate = matchData.date ? new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(matchData.date)) : '';

    return {
      match: matchData,
      currentFormation: (matchData.currentFormation ?? DEFAULT_FORMATION) as FormationType,
      assignedPlayersMap,
      resolvedPlayers,
      resolvedSubstitutedOutPlayers,
      teamNameById,
      formattedDate,
      isLoading: false,
      notFound: false,
    };
  }, [match, matchData, players, teams, playerIds.length, teamIds.length]);

  return state;
};
