'use client';

import { Activity } from 'lucide-react';
import type {
  BasePlayer,
  FilterState,
  MatchMetadata,
  OutcomeFilter as OutcomeType,
  Player,
} from '@/types';
import { FlatPlayerBadges, PlayerBadgeGroup } from './PlayerBadgeGroup';
import { OutcomeFilter } from './Sidebar/OutcomeFilter';
import { StrategyFilter } from './Sidebar/StrategyFilter';
import { TeamFilter } from './Sidebar/TeamFilter';
import { TimelineSourceFilter } from './Sidebar/TimelineSourceFilter';

interface SidebarProps {
  metadata: MatchMetadata;
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

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col backdrop-blur-sm overflow-hidden">
      {/* Fixed Header */}
      <div className="p-6 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">DashBoard</h1>
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
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {/* Player Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex justify-between items-center">
            <span>Player Filter</span>
            {selectedPlayers.size > 0 && (
              <span
                className="text-xs text-blue-400 cursor-pointer"
                onClick={onPlayersClear}
              >
                Clear
              </span>
            )}
          </label>
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
    </aside>
  );
}
