'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarDays, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { db } from '@/lib/db';
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
  <Card className="border-slate-800/70 bg-slate-900/40">
    <CardHeader className="space-y-3">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-1/4" />
    </CardHeader>
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
      <Card className="border-dashed border-slate-800/70 bg-slate-900/40">
        <CardContent className="py-10 text-center text-sm text-slate-400">
          登録された試合がまだありません。「新規試合を登録」ボタンから試合を追加してください。
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {matches.map(match => {
          const matchId = match.id;
          const homeTeamName =
            teamNameById.get(match.team1Id) ?? `Team #${match.team1Id}`;
          const awayTeamName =
            teamNameById.get(match.team2Id) ?? `Team #${match.team2Id}`;

          return (
            <Card
              key={matchId ?? `${match.team1Id}-${match.team2Id}-${match.date}`}
              className="border-slate-800/70 bg-slate-900/40 transition hover:border-sky-500/60 hover:bg-slate-900/60"
            >
              <CardHeader className="mb-0 flex flex-row items-start justify-between gap-4">
                <Link
                  href={matchId ? `/matches/${matchId}` : '#'}
                  className={
                    matchId
                      ? 'flex flex-1 flex-col gap-2'
                      : 'pointer-events-none flex flex-1 flex-col gap-2'
                  }
                  aria-disabled={!matchId}
                >
                  <div>
                    <CardTitle className="text-lg text-slate-100">
                      {homeTeamName} vs {awayTeamName}
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      {formatMatchDate(match.date)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-xs tracking-wide text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    詳細へ
                  </div>
                </Link>

                {matchId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-rose-400"
                        aria-label="試合を削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              </CardHeader>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-800/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          Page {currentPage} / {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={prevPage} disabled={!hasPrev}>
            前へ
          </Button>
          <Button
            variant="outline"
            onClick={nextPage}
            disabled={!hasNext}
          >
            次へ
          </Button>
        </div>
      </div>
    </div>
  );
};
