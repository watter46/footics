'use client';

/**
 * bench-swap-selector.tsx
 * Dropdown UI for selecting a pitch player to swap with a bench player
 */

import { X } from 'lucide-react';
import { getPositionBadgeClass } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';

interface BenchSwapSelectorProps {
  benchPlayer: Player;
  pitchPlayers: Player[];
  teamColor: string;
  onSwap: (pitchPlayerId: string) => void;
  onClose: () => void;
}

export function BenchSwapSelector({
  benchPlayer,
  pitchPlayers,
  teamColor,
  onSwap,
  onClose,
}: BenchSwapSelectorProps) {
  return (
    <div className="p-2 rounded-lg bg-[#1c1c1c] border border-amber-500/40 shadow-lg space-y-1.5">
      <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold border-b border-white/10 pb-1">
        <span>
          Swap #{benchPlayer.shirtNo || '—'} {benchPlayer.name || 'Player'} with
          Pitch Player:
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white cursor-pointer"
        >
          <X size={10} />
        </button>
      </div>

      {pitchPlayers.length === 0 ? (
        <div className="text-[10px] text-white/40 py-1 text-center">
          No pitch players available to swap
        </div>
      ) : (
        <div className="max-h-32 overflow-y-auto space-y-1 custom-scrollbar">
          {pitchPlayers.map((pitchPlayer) => (
            <button
              key={pitchPlayer.id}
              type="button"
              onClick={() => onSwap(pitchPlayer.id)}
              className="flex items-center justify-between w-full px-2 py-1 rounded bg-white/5 hover:bg-amber-500/20 hover:border-amber-500/40 border border-transparent text-left text-[10px] text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[9px] text-white shrink-0"
                  style={{ backgroundColor: teamColor }}
                >
                  {pitchPlayer.shirtNo || '—'}
                </span>
                <span className="truncate">
                  {pitchPlayer.name || `Player ${pitchPlayer.shirtNo}`}
                </span>
              </div>
              {pitchPlayer.position && (
                <span
                  className={`text-[9px] px-1 rounded border font-mono ${getPositionBadgeClass(pitchPlayer.position)}`}
                >
                  {pitchPlayer.position}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
