"use client";

/**
 * Dashboard — オーケストレーション層
 *
 * 責務:
 * 1. useDuckDB() で DB 接続管理
 * 2. useEvents() でフィルタ→クエリ→結果取得
 * 3. Sidebar / EventTimeline に props を渡すだけ
 */
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useDuckDB } from "@/hooks/use-duckdb";
import { useEvents } from "@/hooks/use-events";
import { Sidebar } from "@/components/features/Sidebar";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { MatchMemoModal } from "@/components/features/MatchMemoModal";
import { TacticalBoardModal } from "@/components/features/TacticalBoard/TacticalBoardModal";
import { DataManagementMenu } from "@/components/features/DataManagementMenu";
import { Card } from "@/components/ui/card";
import { Loader2, RefreshCw, ChevronLeft, Edit3, Database, Upload, FileJson, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import type { FilterState, OutcomeFilter } from "@/types";

import { useKeyboardShortcut, useExternalAction, useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts";

import { importMatchJsonFile, loadCustomEventsToDuckDB, cleanupOldCache } from "@/lib/duckdb/data-loader";
import { deleteCustomEvent, deleteMatch } from "@/lib/db";
import { MATCHES } from "@/lib/data/matches";

export default function Dashboard({ matchId }: { matchId: string }) {
  // ── DB State ──
  const { status, db, connection, error, metadata, cacheMissing } = useDuckDB(matchId);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightEventId, setHighlightEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number; second: number; labels: string[]; memo: string } | null>(null);
  const [isMatchMemoOpen, setIsMatchMemoOpen] = useState(false);
  const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // ── Filter State ──
  const [filters, setFilters] = useState<FilterState>({
    selectedTeam: "all",
    selectedPlayers: new Set(),
    outcomeFilter: "all",
    activeStrategies: new Set(),
    activeStrategyParams: {},
    timelineSource: "custom",
  });

  useEffect(() => {
    // 起動時に旧 DB のクリーンアップを試みる
    cleanupOldCache();
  }, []);

  // ── Events (auto-queries on filter change) ──
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

  // ── Keyboard Shortcuts (Centralized Management) ──
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO, setIsMatchMemoOpen);
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, setIsTacticalBoardOpen);

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

  if (status === "error" || (status === "ready" && cacheMissing)) {
    const isCacheMissing = cacheMissing || error?.includes("not found in local storage");

    return (
      <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans">
        {/* Partial Header if metadata is available */}
        {metadata && (
          <div className="flex justify-between items-center px-8 py-4 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-4 text-slate-200">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{metadata.teams.home.name}</span>
                </div>
                <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner border border-slate-700/50 text-blue-400">
                  {metadata.score}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg text-slate-300">{metadata.teams.away.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 p-8 max-w-md w-full shadow-2xl ring-1 ring-slate-700/50">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center ring-1 ring-slate-700">
                {isCacheMissing ? (
                  <Database className="w-8 h-8 text-blue-500 animate-pulse" />
                ) : (
                  <Loader2 className="w-8 h-8 text-red-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                  {isCacheMissing ? "データの再構築が必要です" : "接続エラー"}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed px-4">
                  {isCacheMissing 
                    ? "この試合の基本情報は登録されていますが、詳細データ（Parquet）が欠落しています。分析を開始するには、元の JSON ファイルを再読み込みしてください。"
                    : error || "予期せぬエラーが発生しました"}
                </p>
              </div>

              {isCacheMissing && (
                <div className="w-full space-y-4 pt-2">
                  <input
                    type="file"
                    ref={restoreInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={handleRestoreCache}
                  />
                  <button
                    disabled={isRestoring || !db || !connection}
                    onClick={() => restoreInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/40 disabled:opacity-50 group hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    {isRestoring ? "復旧中..." : "JSONファイルを読み込む"}
                  </button>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5" />
                    WhoScored JSON Format
                  </p>
                </div>
              )}

              {!isCacheMissing && (
                <div className="w-full pt-4 border-t border-slate-800/50">
                  <Link 
                    href="/" 
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all border border-slate-700/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    試合リストに戻る
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg font-medium">Finalizing initialization...</span>
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
              onClick={() => setIsMatchMemoOpen(true)}
              className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group"
              title="Match Memo (Ctrl+M)"
            >
              <Edit3 className="h-4 w-4 mr-2 text-amber-400 group-hover:text-amber-300 transition-colors" />
              Memo
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

        <MatchMemoModal 
          matchId={matchId} 
          isOpen={isMatchMemoOpen} 
          onClose={() => setIsMatchMemoOpen(false)} 
        />

        <TacticalBoardModal 
          matchId={matchId} 
          isOpen={isTacticalBoardOpen} 
          onClose={() => setIsTacticalBoardOpen(false)} 
          metadata={metadata}
        />
      </main>
    </div>
  );
}
