import { useCallback } from 'react';
import { db, type Match } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { useEditEventStore } from '@/features/match-detail/stores/edit-event-store';
import type { FormationSelectionTarget } from '@/features/match-detail/hooks/useFormationSelection';

interface UseMatchEventRecorderParams {
  match: Match | null;
  matchId: number | undefined;
  selectedTarget: FormationSelectionTarget | null;
  bufferedMatchTime: string | null;
  fallbackTime: string;
  onClose: () => void;
  onAfterRecord?: () => void;
}

export const useMatchEventRecorder = ({
  match,
  matchId,
  selectedTarget,
  bufferedMatchTime,
  fallbackTime,
  onClose,
  onAfterRecord,
}: UseMatchEventRecorderParams) => {
  const openEditSheet = useEditEventStore(state => state.openEditSheet);

  const handleActionSelect = useCallback(
    async (actionId: number) => {
      if (!match || !matchId || !selectedTarget) {
        onClose();
        return;
      }

      const matchTime = bufferedMatchTime ?? fallbackTime;
      const subjectTeamId =
        typeof match.subjectTeamId === 'number'
          ? match.subjectTeamId
          : match.team1Id;
      const opponentTeamId =
        subjectTeamId === match.team1Id ? match.team2Id : match.team1Id;
      const eventTeamId =
        selectedTarget.type === 'opponent'
          ? opponentTeamId ?? subjectTeamId
          : subjectTeamId;

      try {
        const isPlayerTarget = selectedTarget.type === 'player';
        const subjectLabel = isPlayerTarget
          ? selectedTarget.label
          : selectedTarget.position;

        let resolvedPlayerId: number | null = null;
        let resolvedTempSlotId: string | null = null;

        if (isPlayerTarget) {
          if (selectedTarget.tempSlotId) {
            resolvedTempSlotId = selectedTarget.tempSlotId;
          } else if (typeof selectedTarget.playerId === 'number') {
            resolvedPlayerId = selectedTarget.playerId;
          }
        }

        const addEventPromise = db.events.add({
          matchId,
          teamId: eventTeamId,
          actionId,
          matchTime,
          playerId: isPlayerTarget ? resolvedPlayerId : null,
          tempSlotId: isPlayerTarget ? resolvedTempSlotId : null,
          positionName: isPlayerTarget ? selectedTarget.positionLabel : undefined,
          opponentPosition:
            selectedTarget.type === 'opponent'
              ? selectedTarget.position
              : undefined,
        });
        const actionPromise = db.actions_master.get(actionId);

        const eventId = await addEventPromise;
        const action = await actionPromise;

        toast.success(
          {
            eventId,
            subject: subjectLabel,
            actionName: action?.name ?? 'アクション',
            time: matchTime,
          },
          undefined,
          () => {
            openEditSheet(eventId);
          }
        );
      } catch (error) {
        console.error('Failed to save event', error);
        toast.error('記録に失敗しました');
      } finally {
        onAfterRecord?.();
        onClose();
      }
    },
    [
      bufferedMatchTime,
      fallbackTime,
      match,
      matchId,
      onAfterRecord,
      onClose,
      openEditSheet,
      selectedTarget,
    ]
  );

  return { handleActionSelect };
};
