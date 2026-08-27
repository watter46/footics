'use client';

import {
  ChevronLeft,
  Database,
  FileJson,
  Film,
  Loader2,
  Plus,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { EventTimeline } from '@/components/features/analysis';
import { DataManagementMenu } from '@/components/features/management';
import { MemoOverlayModal } from '@/components/features/memo-overlay/MemoOverlayModal';
import { Sidebar } from '@/components/features/sidebar';
import { TacticalAnimationModal } from '@/components/features/tactical-animation/tactical-animation-modal';
import { TacticalBoardModal } from '@/components/features/tactical-board/tactical-board-modal';
import { Card } from '@/components/ui/card';
import { useDashboard } from '@/hooks/features/dashboard/use-dashboard';
import { useModalToggleShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useMemoOverlayStore } from '@/stores/memo-overlay-store';
import { useUIStore } from '@/stores/ui-store';

export default function Dashboard({ matchId }: { matchId: string }) {
  const d = useDashboard(matchId);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isTacticalBoardOpen = useUIStore((s) => s.isTacticalBoardOpen);
  const setTacticalBoardOpen = useUIStore((s) => s.setTacticalBoardOpen);
  const isTacticalAnimationOpen = useUIStore((s) => s.isTacticalAnimationOpen);
  const setTacticalAnimationOpen = useUIStore(
    (s) => s.setTacticalAnimationOpen,
  );
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

  useModalToggleShortcut(
    SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD,
    setTacticalBoardOpen,
    { isOpen: isTacticalBoardOpen },
  );

  // Loading States
  if (
    d.status === 'idle' ||
    d.status === 'initializing' ||
    d.status === 'loading-data'
  ) {
    const statusMessage =
      d.status === 'initializing'
        ? 'Initializing DuckDB-WASM...'
        : 'Loading match data...';
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-lg font-medium">{statusMessage}</span>
      </div>
    );
  }

  // Error / Cache Missing State
  if (d.status === 'error' || (d.status === 'ready' && d.cacheMissing)) {
    const isCacheMissing =
      d.cacheMissing || d.error?.includes('not found in local storage');
    return (
      <div className="flex h-screen w-full flex-col bg-slate-950 text-slate-50 overflow-hidden font-sans">
        {d.metadata && (
          <div className="flex justify-between items-center px-8 py-4 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-4 text-slate-200">
                <span className="font-bold text-lg">
                  {d.metadata.teams.home.name}
                </span>
                <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold border border-slate-700/50 text-blue-400">
                  {d.metadata.score}
                </div>
                <span className="font-bold text-lg text-slate-300">
                  {d.metadata.teams.away.name}
                </span>
              </div>
            </div>
          </div>
        )}
        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent">
          <Card className="bg-slate-900/80 backdrop-blur-xl border-slate-800 p-8 max-w-md w-full shadow-2xl ring-1 ring-slate-700/50">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center ring-1 ring-slate-700">
                {isCacheMissing ? (
                  <Database className="w-8 h-8 text-blue-500 animate-pulse" />
                ) : (
                  <Loader2 className="w-8 h-8 text-red-500" />
                )}
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-100 tracking-tight">
                  {isCacheMissing ? 'データの再構築が必要です' : '接続エラー'}
                </h2>
                <p className="text-sm text-slate-400 leading-relaxed px-4">
                  {isCacheMissing
                    ? '以前の JSON ファイルを再読み込みしてください。'
                    : d.error || '予期せぬエラーが発生しました'}
                </p>
              </div>
              {isCacheMissing && (
                <div className="w-full space-y-4 pt-2">
                  <input
                    type="file"
                    ref={d.restoreInputRef}
                    accept=".json"
                    className="hidden"
                    onChange={d.handleRestoreCache}
                  />
                  <button
                    type="button"
                    onClick={() => d.restoreInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-3 px-4 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    {d.isRestoring ? '復旧中...' : 'JSONファイルを読み込む'}
                  </button>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                    <FileJson className="w-3.5 h-3.5" />
                    WhoScored JSON Format
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
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
        <div className="flex justify-between items-center mb-4 sm:mb-6 pl-0 sm:pl-2 pb-3 sm:pb-4 border-b border-slate-800/60 z-10 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="p-1.5 sm:p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors shrink-0"
              title="Back to Match List"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-4 text-slate-200 min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <img
                  src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${d.metadata.teams.home.teamId}.png`}
                  alt={d.metadata.teams.home.name}
                  className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
                />
                <span className="font-bold text-xs sm:text-lg truncate max-w-[70px] sm:max-w-none">
                  {d.metadata.teams.home.name}
                </span>
              </div>
              <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-800/80 rounded-md font-mono text-xs sm:text-sm font-bold shadow-inner shrink-0">
                {d.metadata.score}
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="font-bold text-xs sm:text-lg text-slate-300 truncate max-w-[70px] sm:max-w-none">
                  {d.metadata.teams.away.name}
                </span>
                <img
                  src={`https://d2zywfiolv4f83.cloudfront.net/img/teams/${d.metadata.teams.away.teamId}.png`}
                  alt={d.metadata.teams.away.name}
                  className="w-5 h-5 sm:w-7 sm:h-7 object-contain shrink-0"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Filter Button */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 rounded-lg text-xs font-bold transition-all"
              aria-label="Open Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden xs:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 text-[10px] text-white font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTacticalAnimationOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
              title="アニメーション作成"
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden md:inline">アニメーション作成</span>
            </button>
            <button
              type="button"
              onClick={handleAddEvent}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-amber-900/20"
              title="Add Event"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Add Event</span>
            </button>
            <DataManagementMenu
              matchId={matchId}
              onRefresh={d.handleRefreshCustomEvents}
            />
          </div>
        </div>

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

        <TacticalBoardModal
          matchId={matchId}
          isOpen={isTacticalBoardOpen}
          onClose={() => setTacticalBoardOpen(false)}
          metadata={d.metadata}
        />

        <TacticalAnimationModal
          matchId={matchId}
          isOpen={isTacticalAnimationOpen}
          onClose={() => setTacticalAnimationOpen(false)}
          metadata={d.metadata}
        />

        <MemoOverlayModal matchId={matchId} />
      </main>
    </div>
  );
}
