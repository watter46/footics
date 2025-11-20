'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/db';
import { useMatchList } from './useMatchList';

import { MatchCard } from '@/features/match/components/MatchCard';
import { DeleteButton } from '../MatchCard/parts/DeleteButton';

const MatchCardSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-3">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </Card>
);

export const MatchList = () => {
  // useMatchListからロジックを借りる
  const { matches, isLoading, pagination, deleteMatch } = useMatchList();
  const { currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage } = pagination;

  // チーム名解決のためのデータ取得（これは親でやって正解です。N+1問題回避のため）
  const teams = useLiveQuery(() => db.temp_teams.orderBy('name').toArray());

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    (teams ?? []).forEach(team => {
      if (team.id !== undefined) map.set(team.id, team.name);
    });
    return map;
  }, [teams]);

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 3 }).map((_, i) => <MatchCardSkeleton key={i} />)}
      </div>
    );
  }

  if (!matches.length) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-slate-400">
          登録された試合がまだありません。
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {matches.map(match => {
          const homeName = teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
          const awayName = teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

          return (
            <MatchCard
              key={match.id}
              homeTeamName={homeName}
              awayTeamName={awayName}
              date={match.date}
              iconButton={<DeleteButton matchId={match.id} onDelete={deleteMatch} />}
              href={`/matches/${match.id}`}
              className={match.id ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-90'}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 py-8">
        <Button variant="ghost" onClick={prevPage} disabled={!hasPrev} className="h-12 w-12 p-0">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="rounded-full border border-white/5 bg-black/40 px-6 py-2 font-mono text-sm text-slate-400">
          {currentPage} / {totalPages}
        </div>
        <Button variant="ghost" onClick={nextPage} disabled={!hasNext} className="h-12 w-12 p-0">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
