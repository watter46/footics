"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { Player } from "@/types";

// ── ポジション定義 ──

const POSITION_ORDER: Record<string, number> = {
  FW: 0, AML: 1, AMR: 2, AMC: 3, MC: 4, DMC: 5,
  DL: 6, DC: 7, DR: 8, GK: 9, Sub: 10,
};

const CATEGORY_ORDER = ["FW", "MID", "DF", "GK", "SUB"] as const;

function getPositionCategory(position: string): string {
  if (position === "FW") return "FW";
  if (["AML", "AMR", "AMC", "MC", "DMC"].includes(position)) return "MID";
  if (["DL", "DC", "DR"].includes(position)) return "DF";
  if (position === "GK") return "GK";
  return "SUB";
}

function sortPlayersByPosition(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => (POSITION_ORDER[a.position] ?? 99) - (POSITION_ORDER[b.position] ?? 99)
  );
}

// ── Component ──

interface PlayerBadgeGroupProps {
  teamName: string;
  players: Player[];
  colorClass: string;
  selectedPlayers: Set<number>;
  onTogglePlayer: (playerId: number) => void;
}

export function PlayerBadgeGroup({
  teamName,
  players,
  colorClass,
  selectedPlayers,
  onTogglePlayer,
}: PlayerBadgeGroupProps) {
  const sortedPlayers = useMemo(() => sortPlayersByPosition(players), [players]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, Player[]> = {};
    for (const player of sortedPlayers) {
      const category = getPositionCategory(player.position);
      if (!groups[category]) groups[category] = [];
      groups[category].push(player);
    }
    return groups;
  }, [sortedPlayers]);

  if (players.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <div className={`text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}>
        {teamName}
      </div>
      {CATEGORY_ORDER.map((category) => {
        const categoryPlayers = groupedByCategory[category];
        if (!categoryPlayers || categoryPlayers.length === 0) return null;

        return (
          <div key={category} className="space-y-1">
            <div className="text-[9px] text-slate-500 font-medium uppercase tracking-wide pl-0.5">
              {category}
            </div>
            <div className="flex flex-wrap gap-1">
              {categoryPlayers.map((player) => {
                const isSelected = selectedPlayers.has(player.playerId);
                return (
                  <Badge
                    key={player.playerId}
                    variant={isSelected ? "default" : "outline"}
                    className={`cursor-pointer transition-all duration-200 text-[10px] px-1.5 py-0.5 ${
                      isSelected
                        ? "bg-blue-600 hover:bg-blue-500"
                        : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                    onClick={() => onTogglePlayer(player.playerId)}
                  >
                    {player.name}
                  </Badge>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Flat badge list (team-selected mode) ──

interface FlatPlayerBadgesProps {
  players: Player[];
  selectedPlayers: Set<number>;
  onTogglePlayer: (playerId: number) => void;
}

export function FlatPlayerBadges({
  players,
  selectedPlayers,
  onTogglePlayer,
}: FlatPlayerBadgesProps) {
  const sortedPlayers = useMemo(() => sortPlayersByPosition(players), [players]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {sortedPlayers.map((player) => {
        const isSelected = selectedPlayers.has(player.playerId);
        const category = getPositionCategory(player.position);
        return (
          <Badge
            key={player.playerId}
            variant={isSelected ? "default" : "outline"}
            className={`cursor-pointer transition-all duration-200 text-[10px] px-1.5 py-0.5 ${
              isSelected
                ? "bg-blue-600 hover:bg-blue-500"
                : "border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
            onClick={() => onTogglePlayer(player.playerId)}
          >
            <span className="text-slate-500 mr-0.5 text-[8px]">{category}</span>
            {player.name}
          </Badge>
        );
      })}
    </div>
  );
}
