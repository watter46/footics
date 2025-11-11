import { useLiveQuery } from 'dexie-react-hooks';
import { db, type TempPlayer } from '@/lib/db';

export const useTeamPlayers = (teamId: number) =>
  useLiveQuery<TempPlayer[]>(
    async () => db.temp_players.where('teamId').equals(teamId).toArray(),
    [teamId]
  ) ?? [];
