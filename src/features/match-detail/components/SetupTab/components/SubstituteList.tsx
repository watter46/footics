'use client';

import type { TempPlayer } from '@/lib/db';
import { cn } from '@/lib/utils/cn';

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
          <h4 className="sticky top-0 mb-1.5 bg-slate-900/80 px-1 py-1 text-xs font-semibold text-slate-400 uppercase backdrop-blur-sm">
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
                <button
                  key={player.id}
                  type="button"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-left text-sm text-slate-100 transition',
                    'border-slate-800/80 bg-slate-900/40 hover:border-sky-500/70 hover:bg-slate-900/70',
                    highlightVariant === 'reassign' &&
                      'border-amber-500/40 bg-amber-500/10 text-amber-50 hover:border-amber-400 hover:bg-amber-400/20',
                    isSelected &&
                      (highlightVariant === 'reassign'
                        ? 'border-sky-400/80 bg-amber-400/20 text-amber-50'
                        : 'border-sky-400/80 bg-sky-400/10 text-sky-200'),
                    disabled && 'cursor-not-allowed opacity-60 hover:border-slate-800/80 hover:bg-slate-900/40'
                  )}
                  onClick={() =>
                    disabled ? undefined : onPlayerSelect(playerId, isSelected)
                  }
                  disabled={disabled}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {players.length === 0 ? (
        <p className="text-sm text-slate-500">控え選手はいません。</p>
      ) : null}
    </div>
  );
};
