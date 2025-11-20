import type { IMatch, Player } from '@/lib/db';
import {
  FORMATION_POSITIONS,
  type FormationType,
  type FormationPosition,
} from '@/lib/formation-template';
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

export const createResolvedPlayers = (
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

type PlayerToMigrate = {
  playerId: number;
  oldPosition: FormationPosition['position'];
  oldGroup: FormationPosition['group'];
};

type AvailableSlot = {
  slot: FormationPosition;
  isAssigned: boolean;
};

export const migrateAssignedPlayers = (
  currentAssignments: AssignedPlayersMap | null | undefined,
  oldFormationName: FormationType,
  newFormationName: FormationType
): AssignedPlayersMap => {
  if (!currentAssignments) {
    return {};
  }

  const oldSlots = FORMATION_POSITIONS[oldFormationName] ?? [];
  const oldSlotMap = new Map<number, FormationPosition>();
  oldSlots.forEach(slot => oldSlotMap.set(slot.id, slot));

  const playersToMigrate: PlayerToMigrate[] = [];

  Object.entries(currentAssignments).forEach(([positionIdKey, playerId]) => {
    const positionId = Number(positionIdKey);
    if (!Number.isFinite(positionId)) {
      return;
    }

    const oldSlot = oldSlotMap.get(positionId);
    if (!oldSlot) {
      return;
    }

    if (typeof playerId !== 'number' || Number.isNaN(playerId)) {
      return;
    }

    playersToMigrate.push({
      playerId,
      oldPosition: oldSlot.position,
      oldGroup: oldSlot.group,
    });
  });

  const newSlots = FORMATION_POSITIONS[newFormationName] ?? [];
  const availableSlots: AvailableSlot[] = newSlots.map(slot => ({
    slot,
    isAssigned: false,
  }));

  const newAssignedPlayers: AssignedPlayersMap = {};

  playersToMigrate.forEach(player => {
    const exactMatch = availableSlots.find(
      candidate =>
        !candidate.isAssigned && candidate.slot.position === player.oldPosition
    );

    if (!exactMatch) {
      return;
    }

    newAssignedPlayers[exactMatch.slot.id] = player.playerId;
    exactMatch.isAssigned = true;
    // マークして後続の処理で除外
    player.playerId = -1;
  });

  playersToMigrate.forEach(player => {
    if (player.playerId === -1) {
      return;
    }

    const groupMatch = availableSlots.find(
      candidate =>
        !candidate.isAssigned && candidate.slot.group === player.oldGroup
    );

    if (!groupMatch) {
      return;
    }

    newAssignedPlayers[groupMatch.slot.id] = player.playerId;
    groupMatch.isAssigned = true;
    player.playerId = -1;
  });

  return newAssignedPlayers;
};
