import { useLiveQuery } from 'dexie-react-hooks';

import { db, type IMatch } from '@/lib/db';
import type { FormationType } from '@/lib/formation-template';
import type { FormationPlayers } from '@/lib/types';
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
}

const EMPTY_MATCH_STATE: InternalMatchState = {
  match: null,
  currentFormation: DEFAULT_FORMATION,
  assignedPlayersMap: {},
  resolvedPlayers: {} as FormationPlayers,
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

    return {
      match,
      currentFormation: (match.currentFormation ??
        DEFAULT_FORMATION) as FormationType,
      assignedPlayersMap,
      resolvedPlayers,
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
