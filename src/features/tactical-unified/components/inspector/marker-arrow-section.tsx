'use client';

import { MoveRight, Plus } from 'lucide-react';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { DashedArrowIcon } from './inspector-shared-controls';

export interface MarkerArrowSectionProps {
  currentTab: 'arrow_solid' | 'arrow_dash';
  player: Player;
  slideId: string;
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
}

export function MarkerArrowSection({
  currentTab,
  player,
  slideId,
  addArrow,
}: MarkerArrowSectionProps) {
  const dir = player.team === 'away' ? -15 : 15;

  if (currentTab === 'arrow_solid') {
    return (
      <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <MoveRight size={14} className="text-sky-400" />
          Solid Arrow (Pass / Shoot)
        </span>

        <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200 leading-relaxed">
          Attach a direct pass or shot vector from this player.
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              addArrow(slideId, {
                id: crypto.randomUUID(),
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                sourcePlayerId: player.id,
                points: [
                  { x: player.x, y: player.y },
                  {
                    x: player.x + dir,
                    y: player.y,
                  },
                ],
                color: player.style.color || '#38bdf8',
                strokeWidth: 3,
                dashArray: [],
                arrowHead: true,
                endMarker: 'arrow',
              });
            }}
            className="w-full py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus size={14} />+ Add solid arrow in player direction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
      <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
        <DashedArrowIcon size={14} className="text-amber-400" />
        Dashed Arrow (Movement / Run)
      </span>

      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 leading-relaxed">
        Attach an off-the-ball run or tactical trajectory vector.
      </div>

      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            addArrow(slideId, {
              id: crypto.randomUUID(),
              annotationType: 'arrow',
              arrowType: 'move',
              curveType: 'straight',
              sourcePlayerId: player.id,
              points: [
                { x: player.x, y: player.y },
                {
                  x: player.x + dir,
                  y: player.y,
                },
              ],
              color: '#ffffff',
              strokeWidth: 3,
              dashArray: [6, 4],
              arrowHead: true,
              endMarker: 'arrow',
            });
          }}
          className="w-full py-2.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <Plus size={14} />+ Add dashed arrow in player direction
        </button>
      </div>
    </div>
  );
}
