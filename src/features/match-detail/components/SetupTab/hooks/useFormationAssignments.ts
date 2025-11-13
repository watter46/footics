import { useCallback, useEffect, useState } from 'react';
import { db, type Match } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import type { FormationPosition } from '@/lib/formation-template';
import {
  normalizeAssignedPlayers,
  type AssignedPlayersMap,
} from '@/features/match-detail/utils/assignedPlayers';
import { toast } from '@/features/toast/toast-store';

interface UseFormationAssignmentsParams {
  match: Match;
  formationSlots: FormationPosition[];
  resolvedPlayers?: FormationPlayers;
}

interface UseFormationAssignmentsResult {
  assignedPlayers: AssignedPlayersMap;
  getAssignedPlayerId: (positionId: number) => number | undefined;
  getAssignedPlayer: (
    positionId: number
  ) => FormationPlayers[number] | undefined;
  assignPlayer: (positionId: number, playerId: number) => Promise<void>;
  clearPlayer: (positionId: number) => Promise<void>;
}

export const useFormationAssignments = ({
  match,
  formationSlots,
  resolvedPlayers,
}: UseFormationAssignmentsParams): UseFormationAssignmentsResult => {
  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayersMap>(
    () => normalizeAssignedPlayers(match.assignedPlayers)
  );

  useEffect(() => {
    // react-hooks/set-state-in-effect: syncing component state with Dexie persistence is intentional here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssignedPlayers(normalizeAssignedPlayers(match.assignedPlayers));
  }, [match.assignedPlayers]);

  const getAssignedPlayerId = useCallback(
    (positionId: number) => assignedPlayers[positionId],
    [assignedPlayers]
  );

  const getAssignedPlayer = useCallback(
    (positionId: number) => resolvedPlayers?.[positionId],
    [resolvedPlayers]
  );

  const persistAssignments = useCallback(
    async (nextAssignments: AssignedPlayersMap) => {
      if (typeof match.id !== 'number') {
        console.warn('Attempted to persist assignments without match ID');
        toast.error('試合情報がまだ保存されていません');
        return Promise.resolve();
      }

      try {
        await db.matches.update(match.id, {
          assignedPlayers: nextAssignments,
        });
      } catch (error) {
        console.error('Failed to update assigned players', error);
        toast.error('選手の割り当てに失敗しました');
        throw error;
      }
    },
    [match.id]
  );

  const assignPlayer = useCallback(
    async (positionId: number, playerId: number) => {
      const sanitized: AssignedPlayersMap = { ...assignedPlayers };

      Object.entries(sanitized).forEach(([otherPositionId, assignedId]) => {
        if (assignedId === playerId) {
          delete sanitized[Number(otherPositionId)];
        }
      });

      sanitized[positionId] = playerId;
      setAssignedPlayers(sanitized);

      const previousAssignments = assignedPlayers;

      try {
        await persistAssignments(sanitized);
      } catch (error) {
        setAssignedPlayers(previousAssignments);
        throw error;
      }
    },
    [assignedPlayers, persistAssignments]
  );

  const clearPlayer = useCallback(
    async (positionId: number) => {
      const sanitized: AssignedPlayersMap = { ...assignedPlayers };
      if (!(positionId in sanitized)) {
        return;
      }

      delete sanitized[positionId];
      setAssignedPlayers(sanitized);

      const previousAssignments = assignedPlayers;

      try {
        await persistAssignments(sanitized);
      } catch (error) {
        setAssignedPlayers(previousAssignments);
        throw error;
      }
    },
    [assignedPlayers, persistAssignments]
  );

  useEffect(() => {
    const positionsSet = new Set(formationSlots.map(slot => slot.id));
    const sanitized: AssignedPlayersMap = {};

    Object.entries(assignedPlayers).forEach(([positionIdKey, playerId]) => {
      const positionId = Number(positionIdKey);
      if (!Number.isFinite(positionId)) {
        return;
      }

      if (!positionsSet.has(positionId)) {
        return;
      }

      sanitized[positionId] = playerId;
    });

    if (Object.keys(sanitized).length !== Object.keys(assignedPlayers).length) {
      // react-hooks/set-state-in-effect: sanitize assignments when formation slots change
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAssignedPlayers(sanitized);
      void persistAssignments(sanitized);
    }
  }, [assignedPlayers, formationSlots, persistAssignments]);

  return {
    assignedPlayers,
    getAssignedPlayerId,
    getAssignedPlayer,
    assignPlayer,
    clearPlayer,
  };
};
