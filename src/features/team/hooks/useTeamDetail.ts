import { useTeamRepository } from './useTeamRepository';
import { usePlayerRepository } from './usePlayerRepository';
import type { IPlayer } from '@/lib/db';

export function useTeamDetail(teamId: number) {
  const { useGetById } = useTeamRepository();
  const { useGetByTeamId, add, update, remove } = usePlayerRepository();

  const team = useGetById(teamId);
  const players = useGetByTeamId(teamId);

  const addPlayer = async (player: Omit<IPlayer, 'id' | 'teamId'>) => {
    await add({ ...player, teamId });
  };

  const updatePlayer = async (id: number, changes: Partial<IPlayer>) => {
    await update(id, changes);
  };

  const deletePlayer = async (id: number) => {
    await remove(id);
  };

  return {
    team,
    players,
    addPlayer,
    updatePlayer,
    deletePlayer,
  };
}
