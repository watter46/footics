"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { MatchMemoModal } from "@/components/features/MatchMemoModal";
import { TacticalBoardModal } from "@/components/features/TacticalBoard/TacticalBoardModal";
import { ChevronLeft, Edit3 } from "lucide-react";
import Link from "next/link";

import { useKeyboardShortcut, useExternalAction, useModalToggleShortcut } from "@/hooks/use-shortcut";
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts";

import { getCustomEventsByMatch, deleteCustomEvent } from "@/lib/db";
import { MATCHES } from "@/lib/data/matches";
import type { EventRow, MatchMetadata } from "@/types";

interface Props {
  matchId: string;
  defaultHome: string;
  defaultAway: string;
  defaultScore: string;
}

export default function NationalDashboard({ matchId, defaultHome, defaultAway, defaultScore }: Props) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [highlightEventId, setHighlightEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number; second: number; labels: string[]; memo: string } | null>(null);
  const [isMatchMemoOpen, setIsMatchMemoOpen] = useState(false);
  const [isTacticalBoardOpen, setIsTacticalBoardOpen] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);

  const [customEvents, setCustomEvents] = useState<any[]>([]);

  useEffect(() => {
    getCustomEventsByMatch(matchId).then(setCustomEvents);
  }, [matchId, refreshTrigger]);

  useEffect(() => {
    fetch(`/national_data/match_${matchId}.json`)
      .then(res => res.json())
      .then(data => {
        // 構造を使いやすく変換
        const d = data.initialMatchDataForScrappers[0];
        const lineups = d[2];
        const formatted = {
          lineups: {
            homeStarters: lineups[9].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: true })),
            awayStarters: lineups[10].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: true })),
            homeBench: lineups[11].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: false })),
            awayBench: lineups[12].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: false })),
          },
          timeline: d[1] // timeline
        };
        setMatchData(formatted);
      })
      .catch(err => console.error("Failed to load national match data:", err));
  }, [matchId]);

  const handleEditCustomEvent = useCallback((event: any) => {
    // DuckDBからの取得時や IDB からの取得時は labels 配列がない場合があるため、
    // custom_label または label ("A / B") を分割して復元
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
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // ── Keyboard Shortcuts (Centralized Management) ──
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_MATCH_MEMO, setIsMatchMemoOpen);
  useModalToggleShortcut(SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD, setIsTacticalBoardOpen);

  const events: EventRow[] = useMemo(() => {
    return customEvents.map(e => ({
      ...e,
      source: "custom",
      custom_label: Array.isArray(e.labels) ? e.labels.join(" / ") : (e.label || ""),
      custom_memo: e.memo,
      period: 1, // dummy
      expanded_minute: e.minute,
      team_id: 0,
      type_name: "Memo",
      outcome: true
    })).sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      return a.second - b.second;
    });
  }, [customEvents]);

  // Create metadata object from props for consistency with components that expect it
  const metadata: MatchMetadata = useMemo(() => ({
    matchId: matchId,
    date: "", // Date could be passed as prop if needed
    score: defaultScore || "vs",
    matchType: "national",
    playerIdNameDictionary: {},
    teams: {
      home: { 
        teamId: 0, 
        name: defaultHome || "Home", 
        players: matchData ? [...matchData.lineups.homeStarters, ...matchData.lineups.homeBench] : [] 
      } as any,
      away: { 
        teamId: 1, 
        name: defaultAway || "Away", 
        players: matchData ? [...matchData.lineups.awayStarters, ...matchData.lineups.awayBench] : [] 
      } as any
    }
  }), [matchId, defaultHome, defaultAway, defaultScore, matchData]);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <main className="flex-1 flex flex-col p-6 overflow-hidden relative">
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
            
            <div className="flex items-center gap-4 text-slate-200">
              <span className="font-bold text-lg">{metadata.teams.home.name}</span>
              <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner">
                 {metadata.score || defaultScore || "vs"}
              </div>
              <span className="font-bold text-lg text-slate-300">{metadata.teams.away.name}</span>
            </div>
            <span className="ml-4 px-2 py-1 bg-emerald-900/50 text-emerald-400 text-xs font-bold rounded">National</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMatchMemoOpen(true)}
              className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group"
              title="Match Memo (Ctrl+M)"
            >
              <Edit3 className="h-4 w-4 mr-2 text-amber-400 group-hover:text-amber-300 transition-colors" />
              Memo
            </button>
            <div className="text-slate-500 text-sm">
              Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+I</kbd> for Event / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl+M</kbd> for Match
            </div>
          </div>
        </div>
        
        <EventTimeline
          events={events}
          totalCount={events.length}
          isQuerying={false}
          metadata={metadata}
          activeStrategies={new Set()}
          highlightEventId={highlightEventId}
          onEditCustomEvent={handleEditCustomEvent}
          onDeleteCustomEvent={handleDeleteCustomEvent}
        />
        
        <CentralFocusModal 
          matchId={matchId} 
          db={null}
          connection={null}
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
          matchData={matchData}
        />
      </main>
    </div>
  );
}
