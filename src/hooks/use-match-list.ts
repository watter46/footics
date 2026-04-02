"use client";

import { useState, useMemo, useEffect } from "react";
import type { MatchSummary } from "@/types";
import { getAllMatches } from "@/lib/db";

export function useMatchList(serverMatches: MatchSummary[]) {
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"all" | "club" | "national">("all");
  const [idbMatches, setIdbMatches] = useState<MatchSummary[]>([]);
  const [isLoadingIdb, setIsLoadingIdb] = useState(true);

  useEffect(() => {
    async function loadIdbMatches() {
      try {
        const cached = await getAllMatches();
        setIdbMatches(cached);
      } catch (err) {
        console.error("Failed to load IndexedDB matches:", err);
      } finally {
        setIsLoadingIdb(false);
      }
    }
    loadIdbMatches();
  }, []);

  const allMatches = useMemo(() => {
    const merged = new Map<string, MatchSummary>();
    serverMatches.forEach(m => merged.set(m.id, m));
    idbMatches.forEach(m => merged.set(m.id, m));
    return Array.from(merged.values());
  }, [serverMatches, idbMatches]);

  const sortedAndFiltered = useMemo(() => {
    let sorted = [...allMatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    if (activeType !== "all") {
      sorted = sorted.filter((m) => m.matchType === activeType);
    }
    if (activeTeam) {
      sorted = sorted.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(activeTeam.toLowerCase()) ||
          m.awayTeam.name.toLowerCase().includes(activeTeam.toLowerCase())
      );
    }
    return sorted;
  }, [allMatches, activeTeam, activeType]);

  return {
    activeTeam, setActiveTeam,
    activeType, setActiveType,
    idbMatches,
    isLoadingIdb,
    sortedAndFiltered
  };
}
