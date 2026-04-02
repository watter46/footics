"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { getCustomEventsByMatch, deleteCustomEvent } from "@/lib/db";
import type { EventRow, MatchMetadata } from "@/types";
import { useUIStore } from "@/hooks/use-ui-store";

interface UseNationalDashboardProps {
  matchId: string;
  defaultHome: string;
  defaultAway: string;
  defaultScore: string;
}

export function useNationalDashboard({ matchId, defaultHome, defaultAway, defaultScore }: UseNationalDashboardProps) {
  const { setCentralFocusOpen } = useUIStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingEvent, setEditingEvent] = useState<{ id: string; minute: number; second: number; labels: string[]; memo: string } | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [customEvents, setCustomEvents] = useState<any[]>([]);

  useEffect(() => {
    getCustomEventsByMatch(matchId).then(setCustomEvents);
  }, [matchId, refreshTrigger]);

  useEffect(() => {
    fetch(`/national_data/match_${matchId}.json`)
      .then(res => res.json())
      .then(data => {
        const d = data.initialMatchDataForScrappers[0];
        const lineups = d[2];
        const formatted = {
          lineups: {
            homeStarters: lineups[9].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: true })),
            awayStarters: lineups[10].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: true })),
            homeBench: lineups[11].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: false })),
            awayBench: lineups[12].map((p: any) => ({ name: p[0], playerId: p[3], isFirstEleven: false })),
          },
          timeline: d[1]
        };
        setMatchData(formatted);
      })
      .catch(err => console.error("Failed to load national match data:", err));
  }, [matchId]);

  const handleEditCustomEvent = useCallback((event: any) => {
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
    setCentralFocusOpen(true);
  }, [setCentralFocusOpen]);

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
      period: 1,
      expanded_minute: e.minute,
      team_id: 0,
      type_name: "Memo",
      outcome: true
    })).sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      return a.second - b.second;
    });
  }, [customEvents]);

  const metadata: MatchMetadata = useMemo(() => ({
    matchId: matchId,
    date: "",
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

  return {
    events,
    metadata,
    editingEvent,
    setEditingEvent,
    refreshTrigger,
    setRefreshTrigger,
    handleEditCustomEvent,
    handleDeleteCustomEvent
  };
}
