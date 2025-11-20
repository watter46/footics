import { useCallback, useState } from 'react';

import { useMatchRepository } from '@/features/match/hooks/useMatchRepository';
import { toast } from '@/features/toast/toast-store';
import type { IMatch } from '@/lib/db';

export interface MatchUpdatePayload {
  date: string;
  team1Id: number;
  team2Id: number;
  subjectTeamId: number;
}

interface UseMatchUpdateResult {
  isUpdating: boolean;
  updateMatchInfo: (data: MatchUpdatePayload) => Promise<void>;
}

export const useMatchUpdate = (matchId: number): UseMatchUpdateResult => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { getMatch, updateMatch } = useMatchRepository();

  const updateMatchInfo = useCallback(
    async (data: MatchUpdatePayload) => {
      if (!Number.isFinite(matchId)) {
        toast.error('試合IDが無効です');
        return;
      }

      setIsUpdating(true);
      try {
        const currentMatch = await getMatch(matchId);

        if (!currentMatch) {
          throw new Error('Match not found');
        }

        const previousSubjectTeamId =
          currentMatch.subjectTeamId ?? currentMatch.team1Id;
        const nextSubjectTeamId = data.subjectTeamId;
        const shouldResetAssignments =
          previousSubjectTeamId !== nextSubjectTeamId;

        const updatePayload: Partial<IMatch> = {
          date: data.date,
          team1Id: data.team1Id,
          team2Id: data.team2Id,
          subjectTeamId: data.subjectTeamId,
        };

        if (shouldResetAssignments) {
          updatePayload.currentFormation = null;
          updatePayload.assignedPlayers = null;
          updatePayload.substitutedOutPlayerIds = null;
        }

        const updatedCount = await updateMatch(matchId, updatePayload);

        if (!updatedCount) {
          throw new Error('Match not found');
        }

        toast.success('試合情報を更新しました');

        if (shouldResetAssignments) {
          toast.info('分析対象チームが変更されたため、配置データがリセットされました');
        }
      } catch (error) {
        console.error('Failed to update match info', error);
        toast.error('試合情報の更新に失敗しました');
        throw error;
      } finally {
        setIsUpdating(false);
      }
    },
    [matchId, getMatch, updateMatch]
  );

  return {
    isUpdating,
    updateMatchInfo,
  };
};
