import { db } from '@/lib/db';
import type { Player } from '@/lib/db';

export const usePlayerRepository = () => {
  const getPlayersByIds = async (ids: number[]) => {
    const players = await db.players.bulkGet(ids);
    return players.filter((p): p is Player => Boolean(p));
  };

  return {
    getPlayersByIds,
  };
};
