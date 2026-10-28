'use client';

import { Activity, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { FlatPlayerBadges, PlayerBadgeGroup } from '@/features/analysis';
import type {
  BasePlayer,
  FilterState,
  Match,
  OutcomeFilter as OutcomeType,
} from '@/types';
import { OutcomeFilter } from './OutcomeFilter';
import { StrategyFilter } from './StrategyFilter';
import { TeamFilter } from './TeamFilter';
import { TimelineSourceFilter } from './TimelineSourceFilter';

interface SidebarProps {
  metadata: Match;
  filters: FilterState;
  onTeamChange: (teamId: string) => void;
  onPlayerToggle: (playerId: number) => void;
  onPlayersClear: () => void;
  onOutcomeChange: (outcome: OutcomeType) => void;
  onStrategyToggle: (strategyId: string) => void;
  onStrategyParamChange: (
    strategyId: string,
    paramId: string,
    value: unknown,
  ) => void;
  onTimelineSourceChange: (source: 'all' | 'whoscored' | 'custom') => void;
  isOpenOnMobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  metadata,
  filters,
  onTeamChange,
  onPlayerToggle,
  onPlayersClear,
  onOutcomeChange,
  onStrategyToggle,
  onStrategyParamChange,
  onTimelineSourceChange,
  isOpenOnMobile = false,
  onClose,
}: SidebarProps) {
  const { teams } = metadata;
  const {
    selectedTeam,
    selectedPlayers,
    outcomeFilter,
    activeStrategies,
    activeStrategyParams,
    timelineSource,
  } = filters;

  const currentPlayers: BasePlayer[] =
    selectedTeam === 'all'
      ? [...teams.home.players, ...teams.away.players]
      : selectedTeam === teams.home.teamId.toString()
        ? teams.home.players
        : teams.away.players;

  const sidebarContent = (
    <div className="w-80 max-w-[85vw] lg:w-80 h-full border-r border-white/[0.07] bg-[#121214] flex flex-col backdrop-blur-md overflow-hidden shrink-0">
      {/* Fixed Header */}
      <div className="p-5 sm:p-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-[#FF8100]" />
            <h1 className="text-lg font-bold tracking-tight text-[#F4F4F5]">
              Filters
            </h1>
          </div>
          {onClose && (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden"
              aria-label="Close Filters"
            >
              <X className="w-4 h-4 text-[#A1A1AA]" />
            </IconButton>
          )}
        </div>

        <TeamFilter
          selectedTeam={selectedTeam}
          teams={teams}
          onTeamChange={onTeamChange}
        />

        <TimelineSourceFilter
          timelineSource={timelineSource}
          onChange={onTimelineSourceChange}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 space-y-4">
        {/* Player Filter */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A] flex justify-between items-center">
            <span>Player Filter</span>
            {selectedPlayers.size > 0 && (
              <button
                type="button"
                className="text-xs text-[#FF8100] cursor-pointer hover:text-[#FFA336]"
                onClick={onPlayersClear}
              >
                Clear
              </button>
            )}
          </div>
          <div className="border border-white/[0.07] rounded-md bg-[#18181B] p-2 space-y-3">
            {selectedTeam === 'all' ? (
              <>
                <PlayerBadgeGroup
                  teamName={teams.home.name}
                  players={teams.home.players}
                  colorClass="text-blue-400"
                  selectedPlayers={selectedPlayers}
                  onTogglePlayer={onPlayerToggle}
                />
                <div className="border-t border-white/[0.07] my-1" />
                <PlayerBadgeGroup
                  teamName={teams.away.name}
                  players={teams.away.players}
                  colorClass="text-emerald-400"
                  selectedPlayers={selectedPlayers}
                  onTogglePlayer={onPlayerToggle}
                />
              </>
            ) : (
              <FlatPlayerBadges
                players={currentPlayers}
                selectedPlayers={selectedPlayers}
                onTogglePlayer={onPlayerToggle}
              />
            )}
          </div>
        </div>

        <OutcomeFilter
          outcomeFilter={outcomeFilter}
          onChange={onOutcomeChange}
        />

        <StrategyFilter
          activeStrategies={activeStrategies}
          activeStrategyParams={activeStrategyParams}
          onStrategyToggle={onStrategyToggle}
          onStrategyParamChange={onStrategyParamChange}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-full shrink-0">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close drawer"
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-default"
          />

          {/* Drawer content */}
          <aside className="relative z-10 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
