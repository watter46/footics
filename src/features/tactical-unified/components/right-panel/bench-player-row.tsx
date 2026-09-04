'use client';

/**
 * bench-player-row.tsx
 * A single bench player row with deploy/swap/remove actions
 */

import { ArrowLeftRight, Plus, Trash2 } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { BenchSwapSelector } from './bench-swap-selector';

interface BenchPlayerRowProps {
  player: Player;
  activeSlideId: string;
  pitchPlayers: Player[];
  teamColor: string;
  isSwapActive: boolean;
  onDeploy: (playerId: string) => void;
  onToggleSwap: (playerId: string) => void;
  onSwap: (benchPlayerId: string, pitchPlayerId: string) => void;
  onRemove: (playerId: string) => void;
  onCloseSwap: () => void;
}

export function BenchPlayerRow({
  player,
  activeSlideId,
  pitchPlayers,
  teamColor,
  isSwapActive,
  onDeploy,
  onToggleSwap,
  onSwap,
  onRemove,
  onCloseSwap,
}: BenchPlayerRowProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/5 group transition-all">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-sm"
            style={{ backgroundColor: teamColor }}
          >
            {player.shirtNo || '—'}
          </span>
          <span
            className="font-medium text-white/90 truncate text-xs"
            title={player.name || player.position || `Player ${player.shirtNo}`}
          >
            {player.name || player.position || `Player ${player.shirtNo}`}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDeploy(player.id)}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-medium shadow-xs transition-colors cursor-pointer"
            title="ピッチに投入"
          >
            <Plus size={11} />
            <span>投入</span>
          </button>
          <button
            type="button"
            onClick={() => onToggleSwap(player.id)}
            className={`p-1 rounded flex items-center justify-center transition-colors cursor-pointer ${
              isSwapActive
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
            title="Swap with pitch player"
          >
            <ArrowLeftRight size={11} />
          </button>
          <button
            type="button"
            onClick={() => onRemove(player.id)}
            className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Swap Candidate Dropdown */}
      {isSwapActive && (
        <BenchSwapSelector
          benchPlayer={player}
          pitchPlayers={pitchPlayers}
          teamColor={teamColor}
          onSwap={(pitchPlayerId) => {
            onSwap(player.id, pitchPlayerId);
            onCloseSwap();
          }}
          onClose={onCloseSwap}
        />
      )}
    </div>
  );
}
