'use client';

import { ChevronLeft, Film, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EventTimeline } from '@/components/features/analysis';
import { Sidebar } from '@/components/features/sidebar';
import { TacticalAnimationModal } from '@/components/features/tactical-animation/tactical-animation-modal';
import { TacticalBoardModal } from '@/components/features/tactical-board/tactical-board-modal';
import { useNationalDashboard } from '@/hooks/features/national-dashboard/use-national-dashboard';
import { useModalToggleShortcut } from '@/hooks/use-shortcut';
import { SHORTCUT_ACTIONS } from '@/lib/shortcuts';
import { useUIStore } from '@/stores/ui-store';

interface Props {
  matchId: string;
  defaultHome: string;
  defaultAway: string;
  defaultScore: string;
}

export default function NationalDashboard({
  matchId,
  defaultHome,
  defaultAway,
  defaultScore,
}: Props) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const d = useNationalDashboard({
    matchId,
    defaultHome,
    defaultAway,
    defaultScore,
  });
  const isTacticalBoardOpen = useUIStore((s) => s.isTacticalBoardOpen);
  const setTacticalBoardOpen = useUIStore((s) => s.setTacticalBoardOpen);
  const isTacticalAnimationOpen = useUIStore((s) => s.isTacticalAnimationOpen);
  const setTacticalAnimationOpen = useUIStore(
    (s) => s.setTacticalAnimationOpen,
  );

  useModalToggleShortcut(
    SHORTCUT_ACTIONS.TOGGLE_TACTICAL_BOARD,
    setTacticalBoardOpen,
    { isOpen: isTacticalBoardOpen },
  );

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
              <span className="font-bold text-xs sm:text-lg truncate max-w-[70px] sm:max-w-none">
                {d.metadata.teams.home.name}
              </span>
              <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-slate-800/80 rounded-md font-mono text-xs sm:text-sm font-bold shadow-inner shrink-0">
                {d.metadata.score}
              </div>
              <span className="font-bold text-xs sm:text-lg text-slate-300 truncate max-w-[70px] sm:max-w-none">
                {d.metadata.teams.away.name}
              </span>
            </div>
            <span className="hidden xs:inline ml-1 sm:ml-4 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-900/50 text-emerald-400 text-[10px] sm:text-xs font-bold rounded shrink-0">
              National
            </span>
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
          </div>
        </div>

        <EventTimeline
          events={d.events}
          totalCount={d.events.length}
          isQuerying={false}
          metadata={d.metadata}
          activeStrategies={d.filters.activeStrategies}
          activeStrategyParams={d.filters.activeStrategyParams}
          onEditCustomEvent={d.handleEditCustomEvent}
          onDeleteCustomEvent={d.handleDeleteCustomEvent}
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
      </main>
    </div>
  );
}
