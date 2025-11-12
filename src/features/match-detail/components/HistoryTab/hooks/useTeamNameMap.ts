import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type Match, type TempTeam } from '@/lib/db';

import { resolveTeamIds } from '../utils';

export const useTeamNameMap = (match: Match): Map<number, string> => {
  const teamIds = resolveTeamIds(match);

  const teamsData = useLiveQuery<TempTeam[]>(async () => {
    if (teamIds.length === 0) {
      return [];
    }

    return db.temp_teams.where('id').anyOf(teamIds).toArray();
  }, [teamIds[0] ?? null, teamIds[1] ?? null]);

  return useMemo(() => {
    const map = new Map<number, string>();

    (teamsData ?? []).forEach(team => {
      if (typeof team.id === 'number') {
        map.set(team.id, team.name);
      }
    });

    return map;
  }, [teamsData]);
};
