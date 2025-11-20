import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import type { ITeam } from '@/lib/db';

export function useTeamRepository() {
  const useGetAll = () => useLiveQuery(() => db.teams.toArray()) ?? [];

  const useGetById = (id: number) => useLiveQuery(() => db.teams.get(id), [id]);

  const add = (team: Omit<ITeam, 'id'>) => db.teams.add(team as ITeam);

  const update = (id: number, changes: Partial<ITeam>) => db.teams.update(id, changes);

  const remove = (id: number) => db.teams.delete(id);

  return {
    useGetAll,
    useGetById,
    add,
    update,
    remove,
  };
}
