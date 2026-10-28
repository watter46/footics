'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/patterns/error-state';
import { PageLoading } from '@/components/ui/patterns/loading-state';
import Dashboard from '@/features/dashboard/components/Dashboard';
import { useMatchDetail } from '@/features/match/hooks/use-match-detail';
import NationalDashboard from '@/features/national-dashboard/components/NationalDashboard';

interface Props {
  matchId: string;
}

export function MatchViewWrapper({ matchId }: Props) {
  const {
    match: matchData,
    isLoading,
    recordRecentMatch,
  } = useMatchDetail(matchId);

  const status = isLoading ? 'loading-data' : matchData ? 'ready' : 'error';
  const error = null;

  // 拡張機能から現在のアクティブな試合を特定できるように保存
  useEffect(() => {
    if (matchId) {
      void recordRecentMatch(matchId);
      // DOM 経由で拡張機能 (Isolated World) に受け渡す
      document.documentElement.dataset.matchId = matchId;
    }
    return () => {
      delete document.documentElement.dataset.matchId;
    };
  }, [matchId, recordRecentMatch]);

  if (status === 'loading-data') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0D0D0E] text-white">
        <PageLoading message="Loading match data from IndexedDB..." />
      </div>
    );
  }

  if (status === 'error' || !matchData) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0D0D0E] p-6">
        <ErrorState
          title="Data Not Found"
          code={`Match ID: ${matchId}`}
          message={
            error ||
            'Match data not found in local storage. Please import the JSON file first.'
          }
          backHref="/"
          backLabel="Back to Match List"
          className="max-w-md w-full shadow-2xl"
        />
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
