'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils/cn';
import { useMatchList } from '@/features/matches/hooks/useMatchList';

const formatMatchDate = (value: string) => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(value));
  } catch (error) {
    console.warn('Failed to format match date:', error);
    return value;
  }
};

const MatchCardSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-3">
      <Skeleton className="h-5 w-3/5" />
      <Skeleton className="h-4 w-1/3" />
    </div>
  </Card>
);

export const MatchList = () => {
  const { matches, isLoading, pagination, deleteMatch } = useMatchList();
  const { currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage } = pagination;
  const teams = useLiveQuery(() => db.temp_teams.orderBy('name').toArray());
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const teamNameById = useMemo(() => {
    const map = new Map<number, string>();
    (teams ?? []).forEach(team => {
      if (team.id !== undefined) {
        map.set(team.id, team.name);
      }
    });
    return map;
  }, [teams]);

  const handleDelete = async (matchId?: number) => {
    if (matchId === undefined) return;
    setPendingDeleteId(matchId);
    try {
      await deleteMatch(matchId);
    } catch (error) {
      console.error('Failed to delete match:', error);
    } finally {
      setPendingDeleteId(current => (current === matchId ? null : current));
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <MatchCardSkeleton key={`match-skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (!matches.length) {
    return (
      <Card>
        <div className="py-10 text-center text-sm text-slate-400">
          登録された試合がまだありません。「新規試合を登録」ボタンから試合を追加してください。
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {matches.map(match => {
          const matchId = match.id;
          const homeTeamName =
            teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
          const awayTeamName =
            teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;
          const key = matchId ?? `${match.team1Id}-${match.team2Id}-${match.date}`;

          return (
            <Card
              key={key}
              className={cn(
                'group relative p-6 transition-all duration-200',
                matchId ? 'hover:-translate-y-0.5' : 'opacity-90'
              )}
            >
              {matchId ? (
                <Link
                  href={`/matches/${matchId}`}
                  className="block rounded-3xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:outline-none"
                >
                  <div className="flex flex-col gap-4 pr-14">
                    <div className="flex flex-wrap items-baseline gap-2 text-lg font-bold text-slate-100">
                      <span className="truncate">{homeTeamName}</span>
                      <span className="text-slate-300">vs</span>
                      <span className="truncate">{awayTeamName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <CalendarDays className="h-4 w-4 text-slate-500" />
                      <span>{formatMatchDate(match.date)}</span>
                    </div>
                    {match.currentFormation ? (
                      <p className="text-xs font-semibold tracking-widest text-slate-500 uppercase">
                        {`Formation ${match.currentFormation}`}
                      </p>
                    ) : null}
                    <div className="text-sm font-semibold text-slate-500">
                      詳細を見る &rarr;
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex flex-col gap-4 pr-14">
                  <div className="flex flex-wrap items-baseline gap-2 text-lg font-bold text-slate-100">
                    <span className="truncate">{homeTeamName}</span>
                    <span>vs</span>
                    <span className="truncate">{awayTeamName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span>{formatMatchDate(match.date)}</span>
                  </div>
                </div>
              )}

              {matchId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <IconButton
                      variant="ghost"
                      srLabel="試合を削除"
                      className="absolute top-4 right-4 z-10 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>試合を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        この操作は一覧から非表示にしますが、データは分析用に保持されます。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <Button variant="ghost">キャンセル</Button>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(matchId)}
                          disabled={pendingDeleteId === matchId}
                        >
                          {pendingDeleteId === matchId ? '削除中...' : '削除する'}
                        </Button>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 py-8">
        <Button
          variant="ghost"
          onClick={prevPage}
          disabled={!hasPrev}
          className="h-12 w-12 p-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="rounded-full border border-white/5 bg-black/40 px-6 py-2 font-mono text-sm text-slate-400">
          {currentPage} / {totalPages}
        </div>
        <Button
          variant="ghost"
          onClick={nextPage}
          disabled={!hasNext}
          className="h-12 w-12 p-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};
