'use client';

import { Activity, X } from 'lucide-react';
import type {
  BasePlayer,
  FilterState,
  Match,
  OutcomeFilter as OutcomeType,
} from '@/types';
import {
  FlatPlayerBadges,
  PlayerBadgeGroup,
} from '../analysis/PlayerBadgeGroup';
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
    <div className="w-80 max-w-[85vw] lg:w-80 h-full border-r border-slate-800 bg-slate-900 lg:bg-slate-900/50 flex flex-col backdrop-blur-md overflow-hidden shrink-0">
      {/* Fixed Header */}
      <div className="p-5 sm:p-6 pb-0 flex-shrink-0">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-blue-400" />
            <h1 className="text-xl font-bold tracking-tight">Filters</h1>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
              aria-label="Close Filters"
            >
              <X className="w-5 h-5" />
            </button>
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
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex justify-between items-center">
            <span>Player Filter</span>
            {selectedPlayers.size > 0 && (
              <button
                type="button"
                className="text-xs text-blue-400 cursor-pointer hover:text-blue-300"
                onClick={onPlayersClear}
              >
                Clear
              </button>
            )}
          </div>
          <div className="border border-slate-800 rounded-md bg-slate-900/30 p-2 space-y-3">
            {selectedTeam === 'all' ? (
              <>
                <PlayerBadgeGroup
                  teamName={teams.home.name}
                  players={teams.home.players}
                  colorClass="text-blue-400"
                  selectedPlayers={selectedPlayers}
                  onTogglePlayer={onPlayerToggle}
                />
                <div className="border-t border-slate-800/50 my-1" />
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
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm cursor-default"
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
