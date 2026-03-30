"use client";

/**
 * Dashboard — オーケストレーション層
 *
 * 責務:
 * 1. useDuckDB() で DB 接続管理
 * 2. useEvents() でフィルタ→クエリ→結果取得
 * 3. Sidebar / EventTimeline に props を渡すだけ
 */
import { useState, useCallback, useMemo } from "react";
import { useDuckDB } from "@/hooks/use-duckdb";
import { useEvents } from "@/hooks/use-events";
import { Sidebar } from "@/components/features/Sidebar";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { DataManagementMenu } from "@/components/features/DataManagementMenu";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { FilterState, OutcomeFilter } from "@/types";

import { clearMatchCache, loadCustomEventsToDuckDB } from "@/lib/duckdb/data-loader";
import { deleteCustomEvent } from "@/lib/db";
import { MATCHES } from "@/lib/data/matches";

export default function Dashboard({ matchId }: { matchId: string }) {
  // ── DB State ──
  const { status, db, connection, error, metadata } = useDuckDB(matchId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightEventId, setHighlightEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number; second: number; labels: string[]; memo: string } | null>(null);

  // ── Filter State ──
  const [filters, setFilters] = useState<FilterState>({
    selectedTeam: "all",
    selectedPlayers: new Set(),
    outcomeFilter: "all",
    activeStrategies: new Set(),
    activeStrategyParams: {},
    timelineSource: "custom",
  });

  // ── Events (auto-queries on filter change) ──
  // Use refreshTrigger as a dependency implicitly by modifying filters? 
  // No, useEvents only depends on filters and connection. 
  // I need to trigger a re-query... Wait, I can just pass a dummy prop or re-create connection? Use a dummy filter!
  const queryFilters = useMemo(() => ({
    ...filters,
    refreshTimestamp: refreshTrigger
  }), [filters, refreshTrigger]);

  const { events, totalCount, isQuerying } = useEvents(connection, queryFilters as any);

  // ── Filter Callbacks ──
  const handleTeamChange = useCallback((teamId: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTeam: teamId,
      selectedPlayers: new Set(), // チーム変更時はプレイヤー選択をリセット
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

  const handleEditCustomEvent = useCallback((event: any) => {
    // DuckDBからの取得時は labels 配列がないため、custom_label ("A / B") を分割して復元
    const labels = Array.isArray(event.labels)
      ? event.labels
      : (event.custom_label || event.label || "").split(" / ").map((s: string) => s.trim()).filter(Boolean);

    setEditingEvent({
      id: event.id.toString(),
      minute: Number(event.minute),
      second: Number(event.second),
      labels,
      memo: event.custom_memo || event.memo || ''
    });
  }, []);

  const handleDeleteCustomEvent = useCallback(async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    await deleteCustomEvent(eventId);
    if (db && connection) {
      await loadCustomEventsToDuckDB(db, connection, matchId);
      setRefreshTrigger(prev => prev + 1);
    }
  }, [db, connection, matchId]);

  // ── Loading / Error States ──
  if (status === "idle" || status === "initializing" || status === "loading-data") {
    const statusMessage =
      status === "initializing"
        ? "Initializing DuckDB-WASM..."
        : status === "loading-data"
          ? "Loading match data..."
          : "Starting...";

    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg font-medium">{statusMessage}</span>
      </div>
    );
  }

  if (status === "error" || !metadata) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-red-400">
        <Card className="bg-slate-900 border-red-500/50 p-6">
          <p className="text-xl font-bold mb-2">Error</p>
          <p>{error || "Unknown error occurred"}</p>
        </Card>
      </div>
    );
  }

  // ── Ready State ──
  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <Sidebar
        metadata={metadata}
        filters={filters}
        onTeamChange={handleTeamChange}
        onPlayerToggle={handlePlayerToggle}
        onPlayersClear={handlePlayersClear}
        onOutcomeChange={handleOutcomeChange}
        onStrategyToggle={handleStrategyToggle}
        onStrategyParamChange={handleStrategyParamChange}
        onTimelineSourceChange={handleTimelineSourceChange}
      />
      <main className="flex-1 flex flex-col p-6 pt-4 overflow-hidden relative">
        {/* Match Header Section */}
        <div className="flex justify-between items-center mb-6 pl-2 pb-4 border-b border-slate-800/60 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
              title="Back to Match List"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            {metadata ? (
              <div className="flex items-center gap-4 text-slate-200">
                <div className="flex items-center gap-2">
                  <img src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${metadata.teams.home.teamId}.png`} alt={metadata.teams.home.name} className="w-7 h-7 object-contain" />
                  <span className="font-bold text-lg">{metadata.teams.home.name}</span>
                </div>
                <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner">
                  {metadata.score}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-300">{metadata.teams.away.name}</span>
                  <img src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${metadata.teams.away.teamId}.png`} alt={metadata.teams.away.name} className="w-7 h-7 object-contain" />
                </div>
              </div>
            ) : (
              <div className="font-bold text-xl text-slate-200">Match {matchId}</div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <DataManagementMenu 
              matchId={matchId} 
              db={db} 
              connection={connection} 
              onRefresh={() => {
                // To fetch new indexeddb custom events
                if (db && connection) {
                  loadCustomEventsToDuckDB(db, connection, matchId).then(() => {
                    setRefreshTrigger(prev => prev + 1);
                  });
                }
              }} 
            />
            <button
              onClick={() => {
                clearMatchCache(matchId).then(() => window.location.reload());
              }}
              className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group"
            >
              <RefreshCw className="h-4 w-4 mr-2 text-blue-400 group-hover:text-blue-300 transition-colors" />
              ReCache
            </button>
          </div>
        </div>
        <EventTimeline
          events={events}
          totalCount={totalCount}
          isQuerying={isQuerying}
          metadata={metadata}
          activeStrategies={filters.activeStrategies}
          highlightEventId={highlightEventId}
          onEditCustomEvent={handleEditCustomEvent}
          onDeleteCustomEvent={handleDeleteCustomEvent}
        />
        
        <CentralFocusModal 
          matchId={matchId} 
          db={db}
          connection={connection}
          editingEvent={editingEvent}
          onClose={() => setEditingEvent(null)}
          onRefresh={(eventId) => {
            setRefreshTrigger(prev => prev + 1);
            setHighlightEventId(eventId);
          }} 
        />
      </main>
    </div>
  );
}
