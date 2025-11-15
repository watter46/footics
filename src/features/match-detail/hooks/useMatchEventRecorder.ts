import { useCallback } from 'react';
import { db } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import { useEditEventStore } from '@/features/match-detail/stores/edit-event-store';
import type { FormationSelectionTarget } from '@/features/match-detail/hooks/useFormationSelection';

interface UseMatchEventRecorderParams {
  matchId: number | undefined;
  selectedTarget: FormationSelectionTarget | null;
  bufferedMatchTime: string | null;
  fallbackTime: string;
  onClose: () => void;
  onAfterRecord?: () => void;
}

export const useMatchEventRecorder = ({
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
      if (!matchId || !selectedTarget) {
        onClose();
        return;
      }

      const matchTime = bufferedMatchTime ?? fallbackTime;

      try {
        const isPlayerTarget = selectedTarget.type === 'player';
        const subjectLabel = isPlayerTarget
          ? selectedTarget.label
          : selectedTarget.position;
        const addEventPromise = db.events.add({
          matchId,
          actionId,
          matchTime,
          playerId: isPlayerTarget ? selectedTarget.playerId : null,
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
      matchId,
      onAfterRecord,
      onClose,
      openEditSheet,
      selectedTarget,
    ]
  );

  return { handleActionSelect };
};
