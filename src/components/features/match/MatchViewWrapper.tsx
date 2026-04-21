'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import React, { useEffect } from 'react';
import Dashboard from '@/components/features/dashboard/Dashboard';
import NationalDashboard from '@/components/features/national-dashboard/NationalDashboard';
import { Card } from '@/components/ui/card';
import { getMatch, setKeyValue } from '@/lib/db';

interface Props {
  matchId: string;
}

export function MatchViewWrapper({ matchId }: Props) {
  const {
    data: matchData,
    isLoading,
    error: queryError,
  } = useQuery({
    queryKey: ['matchData', matchId],
    queryFn: () => getMatch(matchId),
  });

  const status = isLoading ? 'loading-data' : matchData ? 'ready' : 'error';
  const error = queryError ? (queryError as Error).message : null;

  // 拡張機能から現在のアクティブな試合を特定できるように保存
  useEffect(() => {
    if (matchId) {
      setKeyValue('lastActiveMatchId', matchId);
      // DOM 経由で拡張機能 (Isolated World) に受け渡す
      document.documentElement.dataset.matchId = matchId;
      console.log('[MatchViewWrapper] matchId set to dataset:', matchId);
    }
    return () => {
      delete document.documentElement.dataset.matchId;
    };
  }, [matchId]);

  if (status === 'loading-data') {
    const statusMessage = 'Loading match data from IndexedDB...';

    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-950 text-slate-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <span className="text-lg font-medium text-slate-300">
          {statusMessage}
        </span>
      </div>
    );
  }

  if (status === 'error' || !matchData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-red-400 p-6">
        <Card className="bg-slate-900 border-red-500/50 p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center gap-3 mb-4 text-red-400">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">Data Not Found</h2>
          </div>
          <div className="text-xs font-mono text-slate-500 mb-2 uppercase tracking-wider">
            Match ID: {matchId}
          </div>
          <p className="text-slate-400 mb-6 leading-relaxed text-sm">
            {error ||
              'Match data not found in local storage. Please import the JSON file first.'}
          </p>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl transition-all font-semibold border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Match List
          </Link>
        </Card>
      </div>
    );
  }

  // Determine dashboard based on metadata
  if (matchData.matchType === 'national') {
    return (
      <NationalDashboard
        matchId={matchId}
        defaultHome={matchData.homeTeam.name}
        defaultAway={matchData.awayTeam.name}
        defaultScore={matchData.score}
      />
    );
  }

  return <Dashboard matchId={matchId} />;
}
