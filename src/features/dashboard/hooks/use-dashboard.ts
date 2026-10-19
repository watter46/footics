'use client';

import { useMemo } from 'react';
import { useEvents } from '@/features/analysis';
import { useCustomEventOperations } from './use-custom-event-operations';
import { useDashboardFilters } from './use-dashboard-filters';
import { useMatchCacheRecovery } from './use-match-cache-recovery';
import { useMatchMetadata } from './use-match-metadata';

export function useDashboard(matchId: string) {
  const meta = useMatchMetadata(matchId);
  const recovery = useMatchCacheRecovery();
  const customEvents = useCustomEventOperations();
  const filterOps = useDashboardFilters();

  const queryFilters = useMemo(
    () => ({
      ...filterOps.filters,
      refreshTimestamp: customEvents.refreshTrigger,
    }),
    [filterOps.filters, customEvents.refreshTrigger],
  );

  const { events, totalCount, isQuerying } = useEvents(matchId, queryFilters);

  return useMemo(
    () => ({
      ...meta,
      ...recovery,
      ...filterOps,
      ...customEvents,
      events,
      totalCount,
      isQuerying,
    }),
    [meta, recovery, filterOps, customEvents, events, totalCount, isQuerying],
  );
}
