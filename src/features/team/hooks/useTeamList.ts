import { useTeamRepository } from './useTeamRepository';

export function useTeamList() {
  const { useGetAll, add, remove } = useTeamRepository();
  const teams = useGetAll();

  const createTeam = async (name: string, code: string) => {
    if (!name.trim()) return;
    await add({ name, code });
  };

  const deleteTeam = async (id: number) => {
    await remove(id);
  };

  return {
    teams,
    createTeam,
    deleteTeam,
  };
}
