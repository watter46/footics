import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export const useTeamRepository = () => {
  const getAllTeams = () => useLiveQuery(() => db.teams.orderBy('name').toArray());

  return { getAllTeams };
};
