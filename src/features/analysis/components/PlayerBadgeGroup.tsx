'use client';

import { useMemo } from 'react';
import {
  PositionBadge,
  type PositionType,
} from '@/components/ui/position-badge';
import type { BasePlayer } from '@/types';

// ── ポジション定義 ──

const POSITION_ORDER: Record<string, number> = {
  FW: 0,
  AML: 1,
  AMR: 2,
  AMC: 3,
  MC: 4,
  DMC: 5,
  DL: 6,
  DC: 7,
  DR: 8,
  GK: 9,
  Sub: 10,
};

const CATEGORY_ORDER = ['FW', 'MID', 'DF', 'GK', 'SUB'] as const;

function getPositionCategory(position?: string): string {
  if (!position) return 'SUB';
  if (position === 'FW') return 'FW';
  if (['AML', 'AMR', 'AMC', 'MC', 'DMC'].includes(position)) return 'MID';
  if (['DL', 'DC', 'DR'].includes(position)) return 'DF';
  if (position === 'GK') return 'GK';
  return 'SUB';
}

function toPositionType(category: string): PositionType {
  if (
    category === 'FW' ||
    category === 'MID' ||
    category === 'DF' ||
    category === 'GK'
  ) {
    return category;
  }
  return 'MID';
}

function sortPlayersByPosition(players: BasePlayer[]): BasePlayer[] {
  return [...players].sort(
    (a, b) =>
      (POSITION_ORDER[a.position ?? ''] ?? 99) -
      (POSITION_ORDER[b.position ?? ''] ?? 99),
  );
}

// ── Component ──

interface PlayerBadgeGroupProps {
  teamName: string;
  players: BasePlayer[];
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
  const sortedPlayers = useMemo(
    () => sortPlayersByPosition(players),
    [players],
  );

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, BasePlayer[]> = {};
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
      <div
        className={`text-[10px] font-semibold uppercase tracking-wider ${colorClass}`}
      >
        {teamName}
      </div>
      {CATEGORY_ORDER.map((category) => {
        const categoryPlayers = groupedByCategory[category];
        if (!categoryPlayers || categoryPlayers.length === 0) return null;

        const posType = toPositionType(category);

        return (
          <div key={category} className="space-y-1">
            <div className="text-[9px] text-[#71717A] font-medium uppercase tracking-wide pl-0.5">
              {category}
            </div>
            <div className="flex flex-wrap gap-1">
              {categoryPlayers.map((player) => {
                const isSelected = selectedPlayers.has(player.playerId);
                return (
                  <PositionBadge
                    key={player.playerId}
                    position={posType}
                    label={player.name}
                    variant="button"
                    isActive={isSelected}
                    onSelect={() => onTogglePlayer(player.playerId)}
                    className="px-2 py-0.5 text-[11px]"
                  />
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
  players: BasePlayer[];
  selectedPlayers: Set<number>;
  onTogglePlayer: (playerId: number) => void;
}

export function FlatPlayerBadges({
  players,
  selectedPlayers,
  onTogglePlayer,
}: FlatPlayerBadgesProps) {
  const sortedPlayers = useMemo(
    () => sortPlayersByPosition(players),
    [players],
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {sortedPlayers.map((player) => {
        const isSelected = selectedPlayers.has(player.playerId);
        const category = getPositionCategory(player.position);
        const posType = toPositionType(category);
        return (
          <PositionBadge
            key={player.playerId}
            position={posType}
            label={player.name}
            variant="button"
            isActive={isSelected}
            onSelect={() => onTogglePlayer(player.playerId)}
            className="px-2 py-0.5 text-[11px]"
          />
        );
      })}
    </div>
  );
}
