'use client';

import { ChevronLeft, Film } from 'lucide-react';
import Link from 'next/link';
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
      />
      <main className="flex-1 flex flex-col p-6 overflow-y-auto relative">
        <div className="flex justify-between items-center mb-6 pl-2 pb-4 border-b border-slate-800/60 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-4 text-slate-200">
              <span className="font-bold text-lg">
                {d.metadata.teams.home.name}
              </span>
              <div className="px-3 py-1 bg-slate-800/80 rounded-md font-mono text-sm font-bold shadow-inner">
                {d.metadata.score}
              </div>
              <span className="font-bold text-lg text-slate-300">
                {d.metadata.teams.away.name}
              </span>
            </div>
            <span className="ml-4 px-2 py-1 bg-emerald-900/50 text-emerald-400 text-xs font-bold rounded">
              National
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTacticalAnimationOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
            >
              <Film className="w-3.5 h-3.5" /> アニメーション作成
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
