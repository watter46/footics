import { useCallback, useEffect, useState } from 'react';
import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { useFormationPlayers } from '@/features/match/hooks/useFormationPlayers';
import { migrateAssignedPlayers, normalizeAssignedPlayers, type AssignedPlayersMap } from '@/features/match/utils/assignedPlayers';
import type { Match } from '@/lib/db';
import type { FormationPlayers } from '@/types/formation';
import type { FormationType } from '@/lib/formation-template';
import { toast } from '@/features/toast/toast-store';

interface UseFormationLogicParams {
  match: Match;
  currentFormation: FormationType;
  resolvedPlayers?: FormationPlayers;
}

export const useFormationLogic = ({
  match,
  currentFormation,
  resolvedPlayers,
}: UseFormationLogicParams) => {
  const { updateMatch } = useMatchRepository();

  const { formationSlots, homeFormationPlayers } = useFormationPlayers({
    match,
    formation: currentFormation,
    resolvedPlayers,
  });

  const [assignedPlayers, setAssignedPlayers] = useState<AssignedPlayersMap>(
    () => normalizeAssignedPlayers(match.assignedPlayers)
  );

  // Sync with DB changes
  useEffect(() => {
    // react-hooks/set-state-in-effect: syncing component state with Dexie persistence is intentional here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAssignedPlayers(normalizeAssignedPlayers(match.assignedPlayers));
  }, [match.assignedPlayers]);

  const persistAssignments = useCallback(
    async (nextAssignments: AssignedPlayersMap) => {
      if (typeof match.id !== 'number') return;
      try {
        await updateMatch(match.id, { assignedPlayers: nextAssignments });
      } catch (error) {
        console.error('Failed to update assigned players', error);
        toast.error('選手の割り当てに失敗しました');
        throw error;
      }
    },
    [match.id, updateMatch]
  );

  const assignPlayer = useCallback(async (positionId: number, playerId: number) => {
    const sanitized = { ...assignedPlayers };
    // Remove player from other positions
    Object.entries(sanitized).forEach(([pid, assignedId]) => {
      if (assignedId === playerId) delete sanitized[Number(pid)];
    });
    sanitized[positionId] = playerId;

    setAssignedPlayers(sanitized);
    try {
      await persistAssignments(sanitized);
    } catch (error) {
      setAssignedPlayers(assignedPlayers); // Revert
      throw error;
    }
  }, [assignedPlayers, persistAssignments]);

  const clearPlayer = useCallback(async (positionId: number) => {
    const sanitized = { ...assignedPlayers };
    if (!(positionId in sanitized)) return;
    delete sanitized[positionId];

    setAssignedPlayers(sanitized);
    try {
      await persistAssignments(sanitized);
    } catch (error) {
      setAssignedPlayers(assignedPlayers); // Revert
      throw error;
    }
  }, [assignedPlayers, persistAssignments]);

  const swapPlayers = useCallback(async (fromPositionId: number, toPositionId: number) => {
    if (fromPositionId === toPositionId) return;

    const fromPlayerId = assignedPlayers[fromPositionId];
    const toPlayerId = assignedPlayers[toPositionId];

    if (fromPlayerId === undefined && toPlayerId === undefined) return;

    const nextAssignments = { ...assignedPlayers };

    if (fromPlayerId !== undefined) nextAssignments[toPositionId] = fromPlayerId;
    else delete nextAssignments[toPositionId];

    if (toPlayerId !== undefined) nextAssignments[fromPositionId] = toPlayerId;
    else delete nextAssignments[fromPositionId];

    setAssignedPlayers(nextAssignments);
    try {
      await persistAssignments(nextAssignments);
    } catch (error) {
      setAssignedPlayers(assignedPlayers); // Revert
      throw error;
    }
  }, [assignedPlayers, persistAssignments]);

  const changeFormation = useCallback(async (nextFormation: FormationType) => {
    if (nextFormation === currentFormation) return;
    if (typeof match.id !== 'number') return;

    const migratedAssignments = migrateAssignedPlayers(
      assignedPlayers,
      currentFormation,
      nextFormation
    );

    try {
      await updateMatch(match.id, {
        currentFormation: nextFormation,
        assignedPlayers: migratedAssignments,
      });
      setAssignedPlayers(migratedAssignments);
      toast.success('フォーメーションを変更しました');
    } catch (error) {
      console.error('Failed to update formation', error);
      toast.error('フォーメーションの変更に失敗しました');
      throw error;
    }
  }, [assignedPlayers, currentFormation, match.id, updateMatch]);

  return {
    formationSlots,
    homeFormationPlayers,
    assignedPlayers,
    assignPlayer,
    clearPlayer,
    swapPlayers,
    changeFormation,
  };
};
