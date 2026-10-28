'use client';

import { ChevronLeft, ExternalLink, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EventTimeline } from '@/features/analysis';
import { Sidebar } from '@/features/sidebar';
import { useNationalDashboard } from '../hooks/use-national-dashboard';

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

  const activeFilterCount =
    (d.filters.selectedPlayers.size > 0 ? 1 : 0) +
    (d.filters.selectedTeam !== 'all' ? 1 : 0) +
    (d.filters.outcomeFilter !== 'all' ? 1 : 0) +
    d.filters.activeStrategies.size;

  return (
    <div className="flex h-screen w-full bg-[#0D0D0E] text-white overflow-hidden font-sans">
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
        <div className="flex justify-between items-center mb-4 sm:mb-6 pl-0 sm:pl-2 pb-3 sm:pb-4 border-b border-white/[0.07] z-10 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="p-1.5 sm:p-2 hover:bg-white/[0.06] rounded-lg text-[#A1A1AA] hover:text-white transition-colors shrink-0"
              title="Back to Match List"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-4 text-white min-w-0">
              <span className="font-bold text-xs sm:text-lg truncate max-w-[70px] sm:max-w-none">
                {d.metadata.teams.home.name}
              </span>
              <div className="px-2 py-0.5 sm:px-3 sm:py-1 bg-[#18181B] rounded-md font-mono text-xs sm:text-sm font-bold border border-white/[0.08] text-[#FF8100] shrink-0">
                {d.metadata.score}
              </div>
              <span className="font-bold text-xs sm:text-lg text-[#D4D4D8] truncate max-w-[70px] sm:max-w-none">
                {d.metadata.teams.away.name}
              </span>
            </div>
            <span className="hidden xs:inline ml-1 sm:ml-4 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-xs font-bold rounded shrink-0">
              National
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Mobile Filter Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden relative gap-1.5 text-xs font-bold"
              aria-label="Open Filters"
            >
              <SlidersHorizontal className="size-3.5 text-[#FF8100]" />
              <span className="hidden xs:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center size-4 rounded-full bg-[#FF8100] text-[10px] text-white font-bold ml-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Link
              href={
                matchId
                  ? `/tactical?matchId=${encodeURIComponent(matchId)}`
                  : '/tactical'
              }
              className="btn-guideline-primary inline-flex items-center justify-center whitespace-nowrap outline-none select-none cursor-pointer h-7 px-2.5 text-xs font-semibold rounded-[8px] gap-1.5 btn-interactive active:scale-[0.98]"
              title="Tactical 戦術ボードを開く"
            >
              <ExternalLink className="size-3.5 shrink-0" />
              <span className="hidden md:inline">戦術ボード</span>
            </Link>
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
      </main>
    </div>
  );
}
