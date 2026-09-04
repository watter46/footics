'use client';

import { ArrowLeftRight, Plus, Trash2, X } from 'lucide-react';
import { getPositionBadgeClass } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';

interface FormationBenchItemProps {
  player: Player;
  teamColor: string;
  activeSlideId: string;
  pitchPlayers: Player[];
  activeSwapPlayerId: string | null;
  onToggleSwap: (playerId: string) => void;
  onCloseSwap: () => void;
  onMoveToPitch: (slideId: string, playerId: string) => void;
  onSwapPlayers: (slideId: string, p1: string, p2: string) => void;
  onRemovePlayer: (slideId: string, playerId: string) => void;
}

export function FormationBenchItem({
  player,
  teamColor,
  activeSlideId,
  pitchPlayers,
  activeSwapPlayerId,
  onToggleSwap,
  onCloseSwap,
  onMoveToPitch,
  onSwapPlayers,
  onRemovePlayer,
}: FormationBenchItemProps) {
  const isSwapping = activeSwapPlayerId === player.id;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/5 group transition-all">
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
            onClick={() => onMoveToPitch(activeSlideId, player.id)}
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
              isSwapping
                ? 'bg-amber-500 text-black font-semibold'
                : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white'
            }`}
            title="Swap with pitch player"
          >
            <ArrowLeftRight size={11} />
          </button>
          <button
            type="button"
            onClick={() => onRemovePlayer(activeSlideId, player.id)}
            className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {isSwapping && (
        <div className="p-2 rounded bg-[#1c1c1c] border border-amber-500/40 shadow-lg space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-white/70 font-semibold border-b border-white/10 pb-1">
            <span>
              Swap #{player.shirtNo || '—'} {player.name || 'Player'} with Pitch
              Player:
            </span>
            <button
              type="button"
              onClick={onCloseSwap}
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
                  onClick={() => {
                    onSwapPlayers(activeSlideId, player.id, pitchPlayer.id);
                    onCloseSwap();
                  }}
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
                      className={`text-[9px] px-1 rounded border font-mono ${getPositionBadgeClass(
                        pitchPlayer.position,
                      )}`}
                    >
                      {pitchPlayer.position}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
