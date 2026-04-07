"use client";

import { useDashboard } from "@/hooks/use-dashboard";
import { Sidebar } from "@/components/features/Sidebar";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { MatchMemoModal } from "@/components/features/MatchMemoModal";
import { TacticalBoardModal } from "@/components/features/TacticalBoard/TacticalBoardModal";
import { DataManagementMenu } from "@/components/features/DataManagementMenu";
import { Card } from "@/components/ui/card";
import { Loader2, ChevronLeft, Edit3, Database, Upload, FileJson } from "lucide-react";
import Link from "next/link";

import { useUIStore } from "@/hooks/use-ui-store";
import { useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts";
import { useCallback } from "react";

export default function Dashboard({ matchId }: { matchId: string }) {
  const d = useDashboard(matchId);
  const { 
    isMatchMemoOpen, setMatchMemoOpen,
    isTacticalBoardOpen, setTacticalBoardOpen,
    setHighlightEventId
  } = useUIStore();

  // Modal Shortcuts
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO, setMatchMemoOpen, { isOpen: isMatchMemoOpen });
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, setTacticalBoardOpen, { isOpen: isTacticalBoardOpen });

  const handleCloseCentralFocus = useCallback(() => {
    d.setEditingEvent(null);
  }, [d]);

  const handleRefresh = useCallback((id: string) => {
    d.setRefreshTrigger(p => p + 1);
    setHighlightEventId(id);
  }, [d, setHighlightEventId]);

  // Loading States
  if (d.status === "idle" || d.status === "initializing" || d.status === "loading-data") {
    const statusMessage = d.status === "initializing" ? "Initializing DuckDB-WASM..." : "Loading match data...";
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg font-medium">{statusMessage}</span>
      </div>
    );
  }

  // Error / Cache Missing State
  if (d.status === "error" || (d.status === "ready" && d.cacheMissing)) {
    const isCacheMissing = d.cacheMissing || d.error?.includes("not found in local storage");
    return (
      <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans">
        {d.metadata && (
          <div className="flex justify-between items-center px-8 py-4 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></Link>
              <div className="flex items-center gap-4 text-slate-200">
                <span className="font-bold text-lg">{d.metadata.teams.home.name}</span>
                <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold border border-slate-700/50 text-blue-400">{d.metadata.score}</div>
                <span className="font-bold text-lg text-slate-300">{d.metadata.teams.away.name}</span>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 p-8 max-w-md w-full shadow-2xl ring-1 ring-slate-700/50">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center ring-1 ring-slate-700">
                {isCacheMissing ? <Database className="w-8 h-8 text-blue-500 animate-pulse" /> : <Loader2 className="w-8 h-8 text-red-500" />}
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">{isCacheMissing ? "データの再構築が必要です" : "接続エラー"}</h2>
                <p className="text-sm text-slate-400 leading-relaxed px-4">{isCacheMissing ? "以前の JSON ファイルを再読み込みしてください。" : d.error || "予期せぬエラーが発生しました"}</p>
              </div>
              {isCacheMissing && (
                <div className="w-full space-y-4 pt-2">
                  <input type="file" ref={d.restoreInputRef} accept=".json" className="hidden" onChange={d.handleRestoreCache} />
                  <button onClick={() => d.restoreInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all"><Upload className="w-5 h-5" />{d.isRestoring ? "復旧中..." : "JSONファイルを読み込む"}</button>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5"><FileJson className="w-3.5 h-3.5" />WhoScored JSON Format</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!d.metadata) return null;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <Sidebar
        metadata={d.metadata}
        filters={d.filters}
        onTeamChange={d.handleTeamChange}
        onPlayerToggle={d.handlePlayerToggle}
        onPlayersClear={d.handlePlayersClear}
        onOutcomeChange={d.handleOutcomeChange}
        onStrategyToggle={d.handleStrategyToggle}
        onStrategyParamChange={d.handleStrategyParamChange}
        onTimelineSourceChange={d.handleTimelineSourceChange}
      />
      <main className="flex-1 flex flex-col p-6 pt-4 overflow-hidden relative">
        <div className="flex justify-between items-center mb-6 pl-2 pb-4 border-b border-slate-800/60 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><ChevronLeft className="w-5 h-5" /></Link>
            <div className="flex items-center gap-4 text-slate-200">
              <div className="flex items-center gap-2">
                <img src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${d.metadata.teams.home.teamId}.png`} alt={d.metadata.teams.home.name} className="w-7 h-7 object-contain" />
                <span className="font-bold text-lg">{d.metadata.teams.home.name}</span>
              </div>
              <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner">{d.metadata.score}</div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-300">{d.metadata.teams.away.name}</span>
                <img src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${d.metadata.teams.away.teamId}.png`} alt={d.metadata.teams.away.name} className="w-7 h-7 object-contain" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DataManagementMenu matchId={matchId} db={d.db} connection={d.connection} onRefresh={d.handleRefreshCustomEvents} />
            <button onClick={() => setMatchMemoOpen(true)} className="flex items-center px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-slate-200 shadow-sm transition-all hover:bg-slate-700 group"><Edit3 className="h-4 w-4 mr-2 text-amber-400" />Memo</button>
          </div>
        </div>
        
        <EventTimeline
          events={d.events}
          totalCount={d.totalCount}
          isQuerying={d.isQuerying}
          metadata={d.metadata}
          activeStrategies={d.filters.activeStrategies}
          onEditCustomEvent={d.handleEditCustomEvent}
          onDeleteCustomEvent={d.handleDeleteCustomEvent}
        />
        
        <CentralFocusModal 
          matchId={matchId} db={d.db} connection={d.connection} 
          editingEvent={d.editingEvent} 
          onClose={handleCloseCentralFocus}
          onRefresh={handleRefresh} 
        />

        <MatchMemoModal matchId={matchId} isOpen={isMatchMemoOpen} onClose={() => setMatchMemoOpen(false)} />
        <TacticalBoardModal matchId={matchId} isOpen={isTacticalBoardOpen} onClose={() => setTacticalBoardOpen(false)} metadata={d.metadata} />
      </main>
    </div>
  );
}
