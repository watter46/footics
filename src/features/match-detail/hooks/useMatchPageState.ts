import { useLiveQuery } from 'dexie-react-hooks';

import { db, type IMatch, type Player } from '@/lib/db';
import type { FormationType } from '@/lib/formation-template';
import type { FormationPlayers } from '@/types/formation';
import {
  normalizeAssignedPlayers,
  resolvePlayersForMap,
  type AssignedPlayersMap,
} from '@/features/match-detail/utils/assignedPlayers';

const DEFAULT_FORMATION: FormationType = '4-2-3-1';

interface InternalMatchState {
  match: IMatch | null;
  currentFormation: FormationType;
  assignedPlayersMap: AssignedPlayersMap;
  resolvedPlayers: FormationPlayers;
  resolvedSubstitutedOutPlayers: Player[];
}

const EMPTY_MATCH_STATE: InternalMatchState = {
  match: null,
  currentFormation: DEFAULT_FORMATION,
  assignedPlayersMap: {},
  resolvedPlayers: {} as FormationPlayers,
  resolvedSubstitutedOutPlayers: [],
};

export interface MatchPageState extends InternalMatchState {
  isLoading: boolean;
  notFound: boolean;
}

export const useMatchPageState = (matchId: number): MatchPageState => {
  const liveQueryResult = useLiveQuery<InternalMatchState>(async () => {
    const match = await db.matches.get(matchId);

    if (!match) {
      return EMPTY_MATCH_STATE;
    }

    const assignedPlayersMap = normalizeAssignedPlayers(match.assignedPlayers);

    const resolvedPlayers = await resolvePlayersForMap(assignedPlayersMap);

    const substitutedOutPlayerIds = match.substitutedOutPlayerIds ?? [];
    const resolvedSubstitutedOutPlayers = substitutedOutPlayerIds.length
      ? (await db.players.bulkGet(substitutedOutPlayerIds)).filter(
          (player): player is Player => Boolean(player)
        )
      : [];

    return {
      match,
      currentFormation: (match.currentFormation ??
        DEFAULT_FORMATION) as FormationType,
      assignedPlayersMap,
      resolvedPlayers,
      resolvedSubstitutedOutPlayers,
    } satisfies InternalMatchState;
  }, [matchId]);

  const matchState = liveQueryResult ?? EMPTY_MATCH_STATE;

  const isLoading = liveQueryResult === undefined;
  const notFound = !isLoading && matchState.match === null;

  return {
    ...matchState,
    isLoading,
    notFound,
  };
};
