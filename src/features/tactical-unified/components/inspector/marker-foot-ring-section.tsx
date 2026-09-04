'use client';

import { Circle, Settings } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { ColorInput } from '../common-color-input';
import { RangeInput, Row } from './inspector-shared-controls';

export interface MarkerFootRingSectionProps {
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
}

export function MarkerFootRingSection({
  player,
  slideId,
  updatePlayer,
}: MarkerFootRingSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);
  const upStyle = (s: Partial<Player['style']>) =>
    up({ style: { ...player.style, ...s } });

  return (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
      <span className="text-[11px] font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
        <Settings size={13} className="text-zinc-400" />
        Marker Style & Scale
      </span>

      {/* Marker Type Switcher: 2D Circle vs 3D Foot Ring */}
      <Row label="Marker Type">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-black/40 border border-white/10 w-full">
          <button
            type="button"
            onClick={() => upStyle({ markerType: 'circle' })}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              (player.style.markerType ?? 'circle') === 'circle'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <Circle size={13} />
            <span>2D Circle</span>
          </button>
          <button
            type="button"
            onClick={() => upStyle({ markerType: 'ring' })}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
              player.style.markerType === 'ring'
                ? 'bg-blue-600 text-white font-bold shadow-sm'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <span className="text-sm leading-none">⭕</span>
            <span>3D Ring</span>
          </button>
        </div>
      </Row>

      <Row label="Player Color">
        <ColorInput
          value={player.style.color}
          onChange={(v) => upStyle({ color: v })}
        />
      </Row>

      <RangeInput
        label="Marker Scale"
        value={player.style.sizeScale}
        min={0.4}
        max={2.0}
        step={0.1}
        onChange={(v) => upStyle({ sizeScale: v })}
      />

      <RangeInput
        label="Border Width"
        value={player.style.strokeWidth}
        min={0}
        max={5}
        step={0.5}
        onChange={(v) => upStyle({ strokeWidth: v })}
      />

      <Row label="Team Assignment">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
          {(['home', 'away', 'neutral'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => up({ team: t })}
              className={`py-1.5 px-1 rounded-md text-[10px] font-medium capitalize transition-all cursor-pointer ${
                player.team === t
                  ? t === 'home'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : t === 'away'
                      ? 'bg-red-600 text-white font-bold shadow-sm'
                      : 'bg-zinc-600 text-white font-bold shadow-sm'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}
