'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { getAllMatches } from '@/lib/db';
import { matchKeys } from '@/lib/query-keys';
import type { MatchSummary } from '@/types';

export function useMatchList(serverMatches: MatchSummary[]) {
  const [activeTeam, setActiveTeam] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'all' | 'club' | 'national'>(
    'all',
  );

  const { data: idbMatches = [], isLoading: isLoadingIdb } = useQuery({
    queryKey: matchKeys.lists(),
    queryFn: getAllMatches,
  });

  const allMatches = useMemo(() => {
    const merged = new Map<string, MatchSummary>();
    for (const m of serverMatches) merged.set(m.id, m);
    for (const m of idbMatches) merged.set(m.id, m);
    return Array.from(merged.values());
  }, [serverMatches, idbMatches]);

  const sortedAndFiltered = useMemo(() => {
    let sorted = [...allMatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    if (activeType !== 'all') {
      sorted = sorted.filter((m) => m.matchType === activeType);
    }
    if (activeTeam) {
      sorted = sorted.filter(
        (m) =>
          m.homeTeam.name.toLowerCase().includes(activeTeam.toLowerCase()) ||
          m.awayTeam.name.toLowerCase().includes(activeTeam.toLowerCase()),
      );
    }
    return sorted;
  }, [allMatches, activeTeam, activeType]);

  return {
    activeTeam,
    setActiveTeam,
    activeType,
    setActiveType,
    idbMatches,
    isLoadingIdb,
    sortedAndFiltered,
  };
}
