"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useDuckDB } from "@/hooks/use-duckdb";
import { useEvents } from "@/hooks/use-events";
import { useUIStore } from "@/hooks/use-ui-store";
import { toast } from "sonner";
import { importMatchJsonFile, loadCustomEventsToDuckDB, cleanupOldCache } from "@/lib/duckdb/data-loader";
import { deleteCustomEvent } from "@/lib/db";
import type { FilterState, OutcomeFilter, EventRow } from "@/types";

export function useDashboard(matchId: string) {
  const { status, db, connection, error, metadata, cacheMissing } = useDuckDB(matchId);
  const { setHighlightEventId, setMatchMemoOpen, setTacticalBoardOpen, setCentralFocusOpen } = useUIStore();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number; second: number; labels: string[]; memo: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<FilterState>({
    selectedTeam: "all",
    selectedPlayers: new Set(),
    outcomeFilter: "all",
    activeStrategies: new Set(),
    activeStrategyParams: {},
    timelineSource: "custom",
  });

  useEffect(() => {
    cleanupOldCache();
  }, []);

  const queryFilters = useMemo(() => ({
    ...filters,
    refreshTimestamp: refreshTrigger
  }), [filters, refreshTrigger]);

  const { events, totalCount, isQuerying } = useEvents(connection, queryFilters as any);

  const handleTeamChange = useCallback((teamId: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTeam: teamId,
      selectedPlayers: new Set(),
    }));
  }, []);

  const handlePlayerToggle = useCallback((playerId: number) => {
    setFilters((prev) => {
      const next = new Set(prev.selectedPlayers);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return { ...prev, selectedPlayers: next };
    });
  }, []);

  const handlePlayersClear = useCallback(() => {
    setFilters((prev) => ({ ...prev, selectedPlayers: new Set() }));
  }, []);

  const handleOutcomeChange = useCallback((outcome: OutcomeFilter) => {
    setFilters((prev) => ({ ...prev, outcomeFilter: outcome }));
  }, []);

  const handleStrategyToggle = useCallback((strategyId: string) => {
    setFilters((prev) => {
      const next = new Set(prev.activeStrategies);
      if (next.has(strategyId)) next.delete(strategyId);
      else next.add(strategyId);
      return { ...prev, activeStrategies: next };
    });
  }, []);

  const handleStrategyParamChange = useCallback(
    (strategyId: string, paramId: string, value: unknown) => {
      setFilters((prev) => ({
        ...prev,
        activeStrategyParams: {
          ...prev.activeStrategyParams,
          [strategyId]: {
            ...prev.activeStrategyParams[strategyId],
            [paramId]: value,
          },
        },
      }));
    },
    []
  );

  const handleTimelineSourceChange = useCallback((source: "all" | "whoscored" | "custom") => {
    setFilters((prev) => ({ ...prev, timelineSource: source }));
  }, []);

  const handleEditCustomEvent = useCallback((event: EventRow) => {
    const labels = (event.custom_label || "").split(" / ").map((s: string) => s.trim()).filter(Boolean);

    setEditingEvent({
      id: event.id.toString(),
      minute: Number(event.minute),
      second: Number(event.second),
      labels,
      memo: event.custom_memo || ''
    });
    setCentralFocusOpen(true);
  }, [setCentralFocusOpen]);

  const handleDeleteCustomEvent = useCallback(async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    await deleteCustomEvent(eventId);
    if (db && connection) {
      await loadCustomEventsToDuckDB(db, connection, matchId);
      setRefreshTrigger(prev => prev + 1);
    }
  }, [db, connection, matchId]);

  const handleRestoreCache = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db || !connection) return;

    setIsRestoring(true);
    const toastId = toast.loading("Restoring match cache...", {
      description: "Importing JSON and building Parquet files."
    });

    try {
      await importMatchJsonFile(file, db, connection);
      toast.success("Cache restored successfully!", { id: toastId });
      window.location.reload();
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`, { id: toastId });
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRefreshCustomEvents = useCallback(() => {
    if (db && connection) {
      loadCustomEventsToDuckDB(db, connection, matchId).then(() => {
        setRefreshTrigger(prev => prev + 1);
      });
    }
  }, [db, connection, matchId]);

  return {
    status, db, connection, error, metadata, cacheMissing,
    filters,
    events, totalCount, isQuerying,
    refreshTrigger, setRefreshTrigger,
    editingEvent, setEditingEvent,
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
    handleRefreshCustomEvents
  };
}
