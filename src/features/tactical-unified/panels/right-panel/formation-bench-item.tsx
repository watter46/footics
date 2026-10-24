'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { getPositionBadgeClass } from '@/lib/tactical/player-formatting';
import type { Player } from '@/lib/types/tactical-unified';

export interface FormationBenchItemProps {
  player: Player;
  teamColor: string;
  activeSlideId: string;
  onRemovePlayer: (slideId: string, playerId: string) => void;
  // Backward compatibility optional props
  pitchPlayers?: Player[];
  activeSwapPlayerId?: string | null;
  onToggleSwap?: (playerId: string) => void;
  onCloseSwap?: () => void;
  onMoveToPitch?: (slideId: string, playerId: string) => void;
  onSwapPlayers?: (slideId: string, p1: string, p2: string) => void;
}

export function FormationBenchItem({
  player,
  teamColor,
  activeSlideId,
  onRemovePlayer,
}: FormationBenchItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `bench-player-${player.id}`,
      data: {
        type: 'bench-player',
        playerId: player.id,
        player,
      },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.3 : undefined,
      }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className="space-y-1">
      <div className="flex flex-col items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 group transition-all text-center relative select-none">
        <div className="flex items-center justify-between w-full mb-1">
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold border ${getPositionBadgeClass(
              player.position ?? 'OTHER',
            )}`}
          >
            {player.position || 'SUB'}
          </span>
          <button
            type="button"
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-0.5 text-white/30 hover:text-white/70 transition-colors touch-none"
            title="ドラッグしてピッチにドロップ配置"
            aria-label="Drag player to pitch"
          >
            <GripVertical size={11} />
          </button>
        </div>

        <span
          className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-white my-1 shadow-md shrink-0"
          style={{ backgroundColor: teamColor }}
        >
          {player.shirtNo || '—'}
        </span>

        <span
          className="font-medium text-white/90 truncate w-full text-[11px] my-0.5"
          title={player.name || player.position || `Player ${player.shirtNo}`}
        >
          {player.name || player.position || `Player ${player.shirtNo}`}
        </span>

        <div className="flex items-center justify-end w-full mt-1">
          <button
            type="button"
            onClick={() => onRemovePlayer(activeSlideId, player.id)}
            className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
            title="Remove"
            aria-label="Remove bench player"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>
    </div>
  );
}
