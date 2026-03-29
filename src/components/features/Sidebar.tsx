"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ZonePicker } from "@/components/ui/zone-picker";
import { LengthInput } from "@/components/ui/length-input";
import { PlayerBadgeGroup, FlatPlayerBadges } from "./PlayerBadgeGroup";
import { eventStrategies } from "@/registry";
import { Activity, Filter } from "lucide-react";
import type { FilterState, MatchMetadata, OutcomeFilter, Player } from "@/types";

// ── Props ──

interface SidebarProps {
  metadata: MatchMetadata;
  filters: FilterState;
  onTeamChange: (teamId: string) => void;
  onPlayerToggle: (playerId: number) => void;
  onPlayersClear: () => void;
  onOutcomeChange: (outcome: OutcomeFilter) => void;
  onStrategyToggle: (strategyId: string) => void;
  onStrategyParamChange: (strategyId: string, paramId: string, value: unknown) => void;
  onTimelineSourceChange: (source: "all" | "whoscored" | "custom") => void;
}

// ── Constants ──

const OUTCOME_OPTIONS = [
  { id: "all", label: "All", icon: "●" },
  { id: "success", label: "Success", icon: "✓" },
  { id: "fail", label: "Fail", icon: "✗" },
] as const;

const TIMELINE_SOURCE_OPTIONS = [
  { id: "all", label: "All Events" },
  { id: "custom", label: "My Memos" },
  { id: "whoscored", label: "WhoScored" },
] as const;

// ── Component ──

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

  const currentPlayers: Player[] =
    selectedTeam === "all"
      ? [...teams.home.players, ...teams.away.players]
      : selectedTeam === teams.home.teamId.toString()
        ? teams.home.players
        : teams.away.players;

  const selectedTeamName =
    selectedTeam === "all"
      ? ""
      : selectedTeam === teams.home.teamId.toString()
        ? teams.home.name
        : teams.away.name;

  return (
    <aside className="w-80 border-r border-slate-800 bg-slate-900/50 flex flex-col backdrop-blur-sm overflow-hidden">
      {/* 固定ヘッダー */}
      <div className="p-6 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold tracking-tight">Match Analytics</h1>
        </div>

        {/* Team Filter */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Team Filter
          </label>
          <Select value={selectedTeam} onValueChange={(val) => onTeamChange(val || "all")}>
            <SelectTrigger className="w-full bg-slate-800/50 border-slate-700 text-slate-200">
              <SelectValue placeholder="All Teams">
                {selectedTeam === "all" ? "All Teams" : selectedTeamName}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectItem value="all">All Teams</SelectItem>
              <SelectItem
                value={teams.home.teamId.toString()}
                className="font-medium text-blue-400"
              >
                {teams.home.name} (Home)
              </SelectItem>
              <SelectItem
                value={teams.away.teamId.toString()}
                className="font-medium text-emerald-400"
              >
                {teams.away.name} (Away)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Timeline Source Filter */}
        <div className="space-y-2 mb-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Timeline Source
          </label>
          <div className="flex bg-slate-800/50 p-1 rounded-lg">
            {TIMELINE_SOURCE_OPTIONS.map((option) => {
              const isActive = timelineSource === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => onTimelineSourceChange(option.id as any)}
                  className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-all ${
                    isActive
                      ? "bg-amber-600 text-amber-50 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* スクロール可能な領域 */}
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
            {selectedTeam === "all" ? (
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

        {/* Outcome Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Outcome
          </label>
          <div className="flex gap-1">
            {OUTCOME_OPTIONS.map((option) => {
              const isActive = outcomeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onOutcomeChange(option.id)}
                  className={`
                    flex-1 px-2 py-1.5 rounded-md text-xs font-medium
                    transition-all duration-200 border
                    ${
                      isActive
                        ? option.id === "success"
                          ? "bg-green-600/20 border-green-500/50 text-green-400"
                          : option.id === "fail"
                            ? "bg-red-600/20 border-red-500/50 text-red-400"
                            : "bg-slate-700/50 border-slate-600 text-slate-200"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                    }
                  `}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Event Scopes */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Event Scopes
          </label>
          <div className="flex flex-col gap-2">
            {eventStrategies.map((strategy) => {
              const isActive = activeStrategies.has(strategy.id);
              const strategyParams = activeStrategyParams[strategy.id] || {};

              return (
                <div key={strategy.id} className="relative group">
                  <Button
                    variant={isActive ? "default" : "outline"}
                    onClick={() => onStrategyToggle(strategy.id)}
                    className={`w-full justify-start transition-all duration-300 ${
                      isActive
                        ? strategy.color
                        : "border-slate-700 text-slate-300 bg-slate-800/50 hover:bg-slate-800"
                    }`}
                    title={strategy.description}
                  >
                    <Filter className="mr-2 h-4 w-4" />
                    {strategy.label}
                  </Button>

                  {/* パラメータ付きストラテジー */}
                  {isActive &&
                    strategy.params &&
                    strategy.params.length > 0 && (
                      <div className="mt-2 ml-2 pl-3 border-l-2 border-fuchsia-600/40 space-y-3">
                        {strategy.params.map((param) => {
                          if (param.type === "length") {
                            return (
                              <div key={param.id}>
                                <label className="text-xs text-slate-400 mb-1 block">
                                  {param.label}
                                </label>
                                <LengthInput
                                  value={(strategyParams[param.id] as Record<string, unknown>) || {}}
                                  onChange={(val) =>
                                    onStrategyParamChange(strategy.id, param.id, val)
                                  }
                                />
                              </div>
                            );
                          }
                          if (param.type === "zone") {
                            return (
                              <div key={param.id}>
                                <label className="text-xs text-slate-400 mb-1 block">
                                  {param.label}
                                </label>
                                <ZonePicker
                                  selectedZones={
                                    (strategyParams[param.id] as number[]) || []
                                  }
                                  onChange={(zones) =>
                                    onStrategyParamChange(strategy.id, param.id, zones)
                                  }
                                />
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
