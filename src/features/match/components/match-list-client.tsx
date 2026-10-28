'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import type { Match } from '@/types';
import { useMatchList } from '../hooks/use-match-list';
import { FilterBar } from './match-list/FilterBar';
import { MatchCard } from './match-list/MatchCard';

interface Props {
  matches: Match[];
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
        <EmptyState
          icon={Filter}
          title="No matches found matching filters"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTeam(null)}
            >
              Reset Filters
            </Button>
          }
        />
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
