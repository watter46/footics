'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useEvents } from '@/hooks/use-events';
import { cleanupOldCache, importMatchJsonFile } from '@/lib/data-loader';
import { deleteCustomEvent, getMatch } from '@/lib/db';
import { useMemoOverlayStore } from '@/stores/memo-overlay-store';
import type { EventRow } from '@/types';
import { useDashboardFilters } from './use-dashboard-filters';

export function useDashboard(matchId: string) {
  const {
    data: metadata,
    isLoading: isMetadataLoading,
    error: metadataError,
  } = useQuery({
    queryKey: ['matchData', matchId],
    queryFn: () => getMatch(matchId),
  });

  const status = useMemo(() => {
    if (isMetadataLoading) return 'loading-data';
    if (metadataError || !metadata) return 'error';
    return 'ready';
  }, [isMetadataLoading, metadataError, metadata]);

  const error = metadataError
    ? (metadataError as Error).message
    : !metadata && !isMetadataLoading
      ? 'Metadata not found'
      : null;
  const cacheMissing = !metadata && !isMetadataLoading;

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const {
    filters,
    handleTeamChange,
    handlePlayerToggle,
    handlePlayersClear,
    handleOutcomeChange,
    handleStrategyToggle,
    handleStrategyParamChange,
    handleTimelineSourceChange,
  } = useDashboardFilters();

  useEffect(() => {
    cleanupOldCache();
  }, []);

  const queryFilters = useMemo(
    () => ({
      ...filters,
      refreshTimestamp: refreshTrigger,
    }),
    [filters, refreshTrigger],
  );

  const { events, totalCount, isQuerying } = useEvents(matchId, queryFilters);

  const store = useMemoOverlayStore();

  const handleEditCustomEvent = useCallback(
    (event: EventRow) => {
      const labels = (event.custom_label || '')
        .split(' / ')
        .map((s: string) => s.trim())
        .filter(Boolean);

      store.reset('EVENT');
      store.setEventId(event.id.toString());
      store.setPeriod(Number(event.period));
      store.setTimeStr(
        `${event.minute}:${event.second.toString().padStart(2, '0')}`,
      );
      store.setSelectedLabels(labels);
      store.setMemo(event.custom_memo || '');
      store.forceSetPhase(2); // メモフェーズまで進める
      store.setModalOpen(true);
    },
    [store],
  );

  const handleDeleteCustomEvent = useCallback(async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await deleteCustomEvent(eventId);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleRestoreCache = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsRestoring(true);
      const toastId = toast.loading('Restoring match cache...', {
        description: 'Importing JSON and saving to database.',
      });

      try {
        await importMatchJsonFile(file);
        toast.success('Cache restored successfully!', { id: toastId });
        window.location.reload();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Restore failed: ${message}`, { id: toastId });
      } finally {
        setIsRestoring(false);
      }
    },
    [],
  );

  const handleRefreshCustomEvents = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return useMemo(
    () => ({
      status,
      error,
      metadata,
      cacheMissing,
      filters,
      events,
      totalCount,
      isQuerying,
      refreshTrigger,
      setRefreshTrigger,
      isRestoring,
      restoreInputRef,
      handleTeamChange,
      handlePlayerToggle,
      handlePlayersClear,
      handleOutcomeChange,
      handleStrategyToggle,
      handleStrategyParamChange,
      handleTimelineSourceChange,
      handleEditCustomEvent,
      handleDeleteCustomEvent,
      handleRestoreCache,
      handleRefreshCustomEvents,
    }),
    [
      status,
      error,
      metadata,
      cacheMissing,
      filters,
      events,
      totalCount,
      isQuerying,
      refreshTrigger,
      isRestoring,
      handleTeamChange,
      handlePlayerToggle,
      handlePlayersClear,
      handleOutcomeChange,
      handleStrategyToggle,
      handleStrategyParamChange,
      handleTimelineSourceChange,
      handleEditCustomEvent,
      handleDeleteCustomEvent,
      handleRestoreCache,
      handleRefreshCustomEvents,
    ],
  );
}
