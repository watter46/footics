'use client';

import { ChevronDown, Circle, Hash, ImageIcon, Users } from 'lucide-react';
import { useState } from 'react';
import type { Player } from '@/lib/types/tactical-unified';

interface FormationBatchDisplayProps {
  activeSlideId: string;
  players: Player[];
  homeColor: string;
  awayColor: string;
  onUpdatePlayer: (
    slideId: string,
    playerId: string,
    updates: Partial<Player>,
  ) => void;
}

export function FormationBatchDisplay({
  activeSlideId,
  players,
  homeColor,
  awayColor,
  onUpdatePlayer,
}: FormationBatchDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  const applyInsideContent = (
    teamFilter: 'all' | 'home' | 'away',
    insideContent: 'number' | 'photo' | 'none',
  ) => {
    const targetPlayers =
      teamFilter === 'all'
        ? players
        : players.filter((p) => p.team === teamFilter);

    targetPlayers.forEach((p) => {
      onUpdatePlayer(activeSlideId, p.id, {
        style: { ...p.style, insideContent },
      });
    });
  };

  return (
    <div className="p-2.5">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between w-full text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Users size={12} className="text-blue-400" />
          <span>Batch Player Display</span>
        </span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="mt-2 space-y-1.5 p-2 rounded-lg bg-black/40 border border-white/10">
          {/* All Players */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/60 font-medium">All Players</span>
            <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => applyInsideContent('all', 'number')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                title="Set Number for all players"
              >
                <Hash size={9} />
                <span>Num</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('all', 'photo')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                title="Set Photo for all players"
              >
                <ImageIcon size={9} />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('all', 'none')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
                title="Set Empty for all players"
              >
                <Circle size={9} />
                <span>Empty</span>
              </button>
            </div>
          </div>

          {/* Home Team */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-blue-400 flex items-center gap-1.5 font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full shadow-xs"
                style={{ backgroundColor: homeColor }}
              />
              Home
            </span>
            <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => applyInsideContent('home', 'number')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <Hash size={9} />
                <span>Num</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('home', 'photo')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <ImageIcon size={9} />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('home', 'none')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <Circle size={9} />
                <span>Empty</span>
              </button>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-red-400 flex items-center gap-1.5 font-medium">
              <span
                className="w-1.5 h-1.5 rounded-full shadow-xs"
                style={{ backgroundColor: awayColor }}
              />
              Away
            </span>
            <div className="flex items-center gap-0.5 bg-black/50 rounded border border-white/10 p-0.5">
              <button
                type="button"
                onClick={() => applyInsideContent('away', 'number')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <Hash size={9} />
                <span>Num</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('away', 'photo')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <ImageIcon size={9} />
                <span>Photo</span>
              </button>
              <button
                type="button"
                onClick={() => applyInsideContent('away', 'none')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] text-white/70 hover:text-white hover:bg-white/10 transition-colors uppercase font-medium cursor-pointer"
              >
                <Circle size={9} />
                <span>Empty</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
