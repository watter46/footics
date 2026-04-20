'use client';

import { Filter } from 'lucide-react';
import React from 'react';
import { useMatchList } from '@/hooks/use-match-list';
import type { MatchSummary } from '@/types';
import { FilterBar } from '../match-list/FilterBar';
import { MatchCard } from '../match-list/MatchCard';

interface Props {
  matches: MatchSummary[];
}

export function MatchListClient({ matches: serverMatches }: Props) {
  const {
    activeType,
    setActiveType,
    activeTeam,
    setActiveTeam,
    idbMatches,
    sortedAndFiltered,
  } = useMatchList(serverMatches);

  // Early Return for empty results
  if (sortedAndFiltered.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <FilterBar
          activeType={activeType}
          setActiveType={setActiveType}
          activeTeam={activeTeam}
          setActiveTeam={setActiveTeam}
          resultCount={0}
        />
        <EmptyState onReset={() => setActiveTeam(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        activeType={activeType}
        setActiveType={setActiveType}
        activeTeam={activeTeam}
        setActiveTeam={setActiveTeam}
        resultCount={sortedAndFiltered.length}
      />

      <div className="flex flex-col gap-3">
        {sortedAndFiltered.map((match, i) => {
          const isLatest = i === 0 && !activeTeam;
          const isImported = idbMatches.some((im) => im.id === match.id);

          return (
            <MatchCard
              key={match.id}
              match={match}
              isLatest={isLatest}
              isImported={isImported}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Sub-component for Empty State
 */
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600 bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed">
      <Filter className="w-10 h-10 opacity-40 animate-pulse" />
      <p className="text-base font-medium">No matches found matching filters</p>
      <button
        onClick={onReset}
        className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors font-bold"
      >
        Reset Filters
      </button>
    </div>
  );
}
