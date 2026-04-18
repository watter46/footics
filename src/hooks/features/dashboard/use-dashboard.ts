'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useDuckDB } from '@/hooks/use-duckdb';
import { useEvents } from '@/hooks/use-events';
import { useUIStore } from '@/hooks/use-ui-store';
import { deleteCustomEvent } from '@/lib/db';
import {
  cleanupOldCache,
  importMatchJsonFile,
  loadCustomEventsToDuckDB,
} from '@/lib/duckdb/data-loader';
import type { EventRow } from '@/types';
import { useDashboardFilters } from './use-dashboard-filters';

export function useDashboard(matchId: string) {
  const { status, db, connection, error, metadata, cacheMissing } =
    useDuckDB(matchId);
  const { setCentralFocusOpen } = useUIStore();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingEvent, setEditingEvent] = useState<{
    id: string;
    minute: number;
    second: number;
    labels: string[];
    memo: string;
  } | null>(null);
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

  const { events, totalCount, isQuerying } = useEvents(
    connection,
    queryFilters as any,
  );

  const handleEditCustomEvent = useCallback(
    (event: EventRow) => {
      const labels = (event.custom_label || '')
        .split(' / ')
        .map((s: string) => s.trim())
        .filter(Boolean);

      setEditingEvent({
        id: event.id.toString(),
        minute: Number(event.minute),
        second: Number(event.second),
        labels,
        memo: event.custom_memo || '',
      });
      setCentralFocusOpen(true);
    },
    [setCentralFocusOpen],
  );

  const handleDeleteCustomEvent = useCallback(
    async (eventId: string) => {
      if (!confirm('Are you sure you want to delete this event?')) return;
      await deleteCustomEvent(eventId);
      if (db && connection) {
        await loadCustomEventsToDuckDB(db, connection, matchId);
        setRefreshTrigger((prev) => prev + 1);
      }
    },
    [db, connection, matchId],
  );

  const handleRestoreCache = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !db || !connection) return;

      setIsRestoring(true);
      const toastId = toast.loading('Restoring match cache...', {
        description: 'Importing JSON and building Parquet files.',
      });

      try {
        await importMatchJsonFile(file, db, connection);
        toast.success('Cache restored successfully!', { id: toastId });
        window.location.reload();
      } catch (err: any) {
        toast.error(`Restore failed: ${err.message}`, { id: toastId });
      } finally {
        setIsRestoring(false);
      }
    },
    [db, connection],
  );

  const handleRefreshCustomEvents = useCallback(() => {
    if (db && connection) {
      loadCustomEventsToDuckDB(db, connection, matchId).then(() => {
        setRefreshTrigger((prev) => prev + 1);
      });
    }
  }, [db, connection, matchId]);

  return useMemo(
    () => ({
      status,
      db,
      connection,
      error,
      metadata,
      cacheMissing,
      filters,
      events,
      totalCount,
      isQuerying,
      refreshTrigger,
      setRefreshTrigger,
      editingEvent,
      setEditingEvent,
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
      db,
      connection,
      error,
      metadata,
      cacheMissing,
      filters,
      events,
      totalCount,
      isQuerying,
      refreshTrigger,
      editingEvent,
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
