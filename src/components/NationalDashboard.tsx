"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { EventTimeline } from "@/components/features/EventTimeline";
import { CentralFocusModal } from "@/components/features/CentralFocusModal";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

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

  const [customEvents, setCustomEvents] = useState<any[]>([]);

  useEffect(() => {
    getCustomEventsByMatch(matchId).then(setCustomEvents);
  }, [matchId, refreshTrigger]);

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
      home: { teamId: 0, name: defaultHome || "Home", players: [] } as any,
      away: { teamId: 1, name: defaultAway || "Away", players: [] } as any
    }
  }), [matchId, defaultHome, defaultAway, defaultScore]);

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
          <div className="text-slate-500 text-sm">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">I</kbd> to add memo
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
      </main>
    </div>
  );
}
