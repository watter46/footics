import { useCallback } from 'react';
import { db } from '@/lib/db';
import { toast } from '@/features/toast/toast-store';
import type { FormationSelectionTarget } from '@/features/match-detail/hooks/useFormationSelection';

interface UseMatchEventRecorderParams {
  matchId: number | undefined;
  formattedTime: string;
  selectedTarget: FormationSelectionTarget | null;
  onClose: () => void;
}

export const useMatchEventRecorder = ({
  matchId,
  formattedTime,
  selectedTarget,
  onClose,
}: UseMatchEventRecorderParams) => {
  const handleActionSelect = useCallback(
    async (actionId: number) => {
      if (!matchId || !selectedTarget) {
        onClose();
        return;
      }

      try {
        await db.events.add({
          matchId,
          actionId,
          matchTime: formattedTime,
          playerId:
            selectedTarget.type === 'player' ? selectedTarget.playerId : null,
          opponentPosition:
            selectedTarget.type === 'opponent'
              ? selectedTarget.position
              : undefined,
        });
        toast.success('アクションを記録しました');
      } catch (error) {
        console.error('Failed to save event', error);
        toast.error('記録に失敗しました');
      } finally {
        onClose();
      }
    },
    [formattedTime, matchId, onClose, selectedTarget]
  );

  return { handleActionSelect };
};
