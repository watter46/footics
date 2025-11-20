'use client';

import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Trash2, ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMatchList } from './hooks/useMatchList';

export const MatchList = () => {
  const { matches, pagination, isLoading, handleDelete } = useMatchList();

  if (isLoading) {
    return <MatchListSkeleton />;
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-12 text-slate-400">
        <Calendar className="mb-4 h-12 w-12 opacity-50" />
        <p>登録された試合はありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-1">
        {matches.map((match) => (
          <Card key={match.id} className="group hover:border-primary/20 relative overflow-hidden transition-all hover:shadow-md">
            <Link href={`/matches/${match.id}`} className="block h-full">
              <CardContent className="p-6">
                <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">

                  {/* Date & Info */}
                  <div className="flex min-w-[120px] items-center gap-2 text-sm text-slate-500">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={match.date}>
                      {format(new Date(match.date), 'yyyy/MM/dd (EEE)', { locale: ja })}
                    </time>
                  </div>

                  {/* Teams */}
                  <div className="flex w-full flex-1 items-center justify-center gap-4 sm:w-auto">
                    <div className="flex-1 truncate text-right text-lg font-bold">
                      {match.homeTeam?.name ?? 'Unknown'}
                    </div>
                    <div className="px-2 font-light text-slate-300">VS</div>
                    <div className="flex-1 truncate text-left text-lg font-bold">
                      {match.awayTeam?.name ?? 'Unknown'}
                    </div>
                  </div>

                  {/* Meta / Actions Placeholder */}
                  <div className="hidden w-[120px] justify-end sm:flex">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="h-3 w-3" />
                      <span>詳細へ</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Link>

            {/* Delete Action (Absolute Positioned) */}
            <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:bg-red-50 hover:text-red-500"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (match.id) handleDelete(match.id);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">削除</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {(pagination.totalPages > 1) && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.prevPage}
            disabled={!pagination.hasPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={pagination.nextPage}
            disabled={!pagination.hasNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};

function MatchListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex flex-1 justify-center gap-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        </Card>
      ))}
    </div>
  );
}
