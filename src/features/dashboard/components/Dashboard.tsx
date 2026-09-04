'use client';

import { useCallback, useState } from 'react';
import { EventTimeline } from '@/features/analysis';
import { MemoOverlayModal, useMemoOverlayStore } from '@/features/memo-overlay';
import { Sidebar } from '@/features/sidebar';
import { useDashboard } from '../hooks/use-dashboard';
import {
  CacheRecoveryView,
  DashboardLoadingView,
  TeamSummaryHeader,
} from '../widgets';

export default function Dashboard({ matchId }: { matchId: string }) {
  const d = useDashboard(matchId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const reset = useMemoOverlayStore((state) => state.reset);
  const setModalOpen = useMemoOverlayStore((state) => state.setModalOpen);

  const handleAddEvent = useCallback(() => {
    reset('EVENT');
    setModalOpen(true);
  }, [reset, setModalOpen]);

  const handleEditMatchMemo = useCallback(() => {
    reset('MATCH');
    setModalOpen(true);
  }, [reset, setModalOpen]);

  // Loading States
  if (
    d.status === 'idle' ||
    d.status === 'initializing' ||
    d.status === 'loading-data'
  ) {
    return <DashboardLoadingView status={d.status} />;
  }

  // Error / Cache Missing State
  if (d.status === 'error' || (d.status === 'ready' && d.cacheMissing)) {
    return (
      <CacheRecoveryView
        metadata={d.metadata}
        error={d.error}
        cacheMissing={d.cacheMissing}
        isRestoring={d.isRestoring}
        restoreInputRef={d.restoreInputRef}
        onRestoreCache={d.handleRestoreCache}
      />
    );
  }

  if (!d.metadata) return null;

  const activeFilterCount =
    (d.filters.selectedPlayers.size > 0 ? 1 : 0) +
    (d.filters.selectedTeam !== 'all' ? 1 : 0) +
    (d.filters.outcomeFilter !== 'all' ? 1 : 0) +
    d.filters.activeStrategies.size;

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50 overflow-hidden font-sans">
      <Sidebar
        metadata={d.metadata}
        filters={d.filters}
        onTeamChange={d.handleTeamChange}
        onPlayerToggle={d.handlePlayerToggle}
        onPlayersClear={d.handlePlayersClear}
        onOutcomeChange={d.handleOutcomeChange}
        onStrategyToggle={d.handleStrategyToggle}
        onStrategyParamChange={d.handleStrategyParamChange}
        onTimelineSourceChange={d.handleTimelineSourceChange}
        isOpenOnMobile={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col p-3 sm:p-6 pt-3 sm:pt-4 overflow-y-auto relative min-w-0">
        <TeamSummaryHeader
          metadata={d.metadata}
          activeFilterCount={activeFilterCount}
          matchId={matchId}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onAddEvent={handleAddEvent}
          onRefreshCustomEvents={d.handleRefreshCustomEvents}
        />

        <EventTimeline
          events={d.events}
          totalCount={d.totalCount}
          isQuerying={d.isQuerying}
          metadata={d.metadata}
          activeStrategies={d.filters.activeStrategies}
          activeStrategyParams={d.filters.activeStrategyParams}
          onEditCustomEvent={d.handleEditCustomEvent}
          onDeleteCustomEvent={d.handleDeleteCustomEvent}
          onEditMatchMemo={handleEditMatchMemo}
        />

        <MemoOverlayModal matchId={matchId} />
      </main>
    </div>
  );
}
