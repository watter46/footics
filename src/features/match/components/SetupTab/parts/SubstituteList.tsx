'use client';

import type { TempPlayer } from '@/lib/db';
import { SelectableCard } from '@/components/ui/selectable-card';

import { groupAndSortPlayers } from '../utils/playerListUtils';
import { formatPlayerListLabel } from '../utils/playerLabel';

interface SubstituteListProps {
  players: TempPlayer[];
  selectedPlayerId: number | null;
  onPlayerSelect: (playerId: number, isSelected: boolean) => void;
  disabled?: boolean;
  highlightVariant?: 'default' | 'reassign';
}

export const SubstituteList = ({
  players,
  selectedPlayerId,
  onPlayerSelect,
  disabled = false,
  highlightVariant = 'default',
}: SubstituteListProps) => {
  const groupedPlayers = groupAndSortPlayers(players);

  return (
    <div className="space-y-3">
      {Object.entries(groupedPlayers).map(([groupName, groupPlayers]) => (
        <div key={groupName} className="space-y-2">
          <h4 className="bg-background/80 text-muted-foreground sticky top-0 mb-1.5 px-1 py-1 text-xs font-semibold tracking-[0.3em] uppercase backdrop-blur">
            {groupName}
          </h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {groupPlayers.map(player => {
              if (typeof player.id !== 'number') {
                return null;
              }

              const playerId = player.id as number;
              const isSelected = playerId === selectedPlayerId;
              const label = formatPlayerListLabel(player);

              return (
                <SelectableCard
                  key={player.id}
                  tone={highlightVariant === 'reassign' ? 'warning' : 'default'}
                  isSelected={isSelected}
                  disabled={disabled}
                  onClick={() =>
                    disabled ? undefined : onPlayerSelect(playerId, isSelected)
                  }
                  className="text-sm"
                >
                  {label}
                </SelectableCard>
              );
            })}
          </div>
        </div>
      ))}
      {players.length === 0 ? (
        <p className="text-muted-foreground text-sm">控え選手はいません。</p>
      ) : null}
    </div>
  );
};
