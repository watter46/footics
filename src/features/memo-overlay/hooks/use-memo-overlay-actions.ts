'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { putMatchMemo, saveCustomEvent } from '@/lib/db/extension-db-queries';
import type { CustomEvent, MatchMemo } from '@/lib/db/schema';
import { customEventKeys, eventKeys, matchKeys } from '@/lib/query-keys';

export interface UseMemoOverlayActionsReturn {
  saveEvent: (event: CustomEvent) => Promise<void>;
  saveMemo: (memo: MatchMemo) => Promise<void>;
}

export function useMemoOverlayActions(
  matchId?: string,
): UseMemoOverlayActionsReturn {
  const queryClient = useQueryClient();

  const saveEvent = useCallback(
    async (event: CustomEvent) => {
      await saveCustomEvent(event);
      const targetMatchId = event.match_id || matchId;
      if (targetMatchId) {
        queryClient.invalidateQueries({
          queryKey: customEventKeys.byMatch(targetMatchId),
        });
      }
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
    },
    [matchId, queryClient],
  );

  const saveMemo = useCallback(
    async (memo: MatchMemo) => {
      await putMatchMemo(memo);
      const targetMatchId = memo.matchId || matchId;
      if (targetMatchId) {
        queryClient.invalidateQueries({
          queryKey: matchKeys.memo(targetMatchId),
        });
      }
    },
    [matchId, queryClient],
  );

  return {
    saveEvent,
    saveMemo,
  };
}
