import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';

import { db, type IMatch, type TempTeam } from '@/lib/db';

interface MatchTeamInfo {
  teamNameById: Map<number, string>;
  formattedDate: string;
  isTeamsLoading: boolean;
}

const createTeamNameMap = (teams: TempTeam[]): Map<number, string> => {
  const map = new Map<number, string>();

  teams.forEach(team => {
    if (typeof team.id === 'number') {
      map.set(team.id, team.name);
    }
  });

  return map;
};

const formatMatchDate = (date: string | undefined): string => {
  if (!date) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(date));
  } catch (error) {
    console.warn('Failed to format match date', error);
    return date;
  }
};

export const useMatchTeamInfo = (match: IMatch | null): MatchTeamInfo => {
  const teamIdDependencies = useMemo(
    () => [match?.team1Id ?? null, match?.team2Id ?? null] as const,
    [match?.team1Id, match?.team2Id]
  );

  const teamsData = useLiveQuery<TempTeam[]>(async () => {
    const validTeamIds = teamIdDependencies.filter(
      (teamId): teamId is number => typeof teamId === 'number'
    );

    if (validTeamIds.length === 0) {
      return [];
    }

    return db.temp_teams.where('id').anyOf(validTeamIds).toArray();
  }, [teamIdDependencies[0], teamIdDependencies[1]]);

  const teams = useMemo(() => teamsData ?? [], [teamsData]);

  const teamNameById = useMemo(() => createTeamNameMap(teams), [teams]);

  const formattedDate = useMemo(
    () => formatMatchDate(match?.date),
    [match?.date]
  );

  const isTeamsLoading = Boolean(match) && teamsData === undefined;

  return {
    teamNameById,
    formattedDate,
    isTeamsLoading,
  };
};
