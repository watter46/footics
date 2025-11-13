import type { IMatch, Player } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';

export type AssignedPlayersMap = Record<number, number>;

export const normalizeAssignedPlayers = (
  assignedPlayers: IMatch['assignedPlayers']
): AssignedPlayersMap => {
  if (!assignedPlayers) {
    return {};
  }

  return Object.entries(assignedPlayers).reduce<AssignedPlayersMap>(
    (accumulator, [positionIdKey, playerIdValue]) => {
      const positionId = Number(positionIdKey);
      if (!Number.isFinite(positionId)) {
        return accumulator;
      }

      if (typeof playerIdValue !== 'number' || Number.isNaN(playerIdValue)) {
        return accumulator;
      }

      accumulator[positionId] = playerIdValue;
      return accumulator;
    },
    {}
  );
};

export const resolvePlayersForMap = async (
  assignedPlayers: AssignedPlayersMap,
  playersById?: Map<number, Player>
): Promise<FormationPlayers> => {
  if (assignedPlayers && playersById) {
    return createResolvedPlayers(assignedPlayers, playersById);
  }

  const playerIds = Array.from(new Set(Object.values(assignedPlayers)));

  if (playerIds.length === 0) {
    return {} as FormationPlayers;
  }

  const { db } = await import('@/lib/db');
  const players = await db.players.bulkGet(playerIds);
  const map = new Map<number, Player>();

  players.forEach(player => {
    if (player && typeof player.id === 'number') {
      map.set(player.id, player);
    }
  });

  return createResolvedPlayers(assignedPlayers, map);
};

const createResolvedPlayers = (
  assignedPlayers: AssignedPlayersMap,
  playerById: Map<number, Player>
): FormationPlayers => {
  const resolved: FormationPlayers = {};

  Object.entries(assignedPlayers).forEach(([positionIdKey, playerId]) => {
    const positionId = Number(positionIdKey);
    if (!Number.isFinite(positionId)) {
      return;
    }

    const player = playerById.get(playerId);
    if (player) {
      resolved[positionId] = player;
    }
  });

  return resolved;
};
