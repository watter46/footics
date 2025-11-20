import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { IPlayer } from '@/lib/db';

export function usePlayerRepository() {
  const useGetByTeamId = (teamId: number) =>
    useLiveQuery(() => db.players.where('teamId').equals(teamId).toArray(), [teamId]) ?? [];

  const add = (player: Omit<IPlayer, 'id'>) => db.players.add(player as IPlayer);

  const update = (id: number, changes: Partial<IPlayer>) => db.players.update(id, changes);

  const remove = (id: number) => db.players.delete(id);

  return {
    useGetByTeamId,
    add,
    update,
    remove,
  };
}
