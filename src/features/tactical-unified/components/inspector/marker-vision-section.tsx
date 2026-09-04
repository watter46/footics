'use client';

import { Eye } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { ColorInput } from '../common-color-input';
import { RangeInput, Row } from './inspector-shared-controls';

export interface MarkerVisionSectionProps {
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
}

export function MarkerVisionSection({
  player,
  slideId,
  updatePlayer,
}: MarkerVisionSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);

  const hasVisionCone = !!player.visionCone && player.visionCone.visible;

  const toggleVisionCone = () => {
    if (hasVisionCone) {
      up({ visionCone: undefined });
    } else {
      up({
        visionCone: {
          id: crypto.randomUUID(),
          angleRad: 0,
          spreadRad: Math.PI / 3, // 60°
          radius: 13,
          color: player.style.color || '#3b82f6',
          opacity: 0.3,
          visible: true,
        },
      });
    }
  };

  const updateVisionCone = (
    patch: Partial<NonNullable<Player['visionCone']>>,
  ) => {
    if (!player.visionCone) return;
    up({ visionCone: { ...player.visionCone, ...patch } });
  };

  const angleDeg = player.visionCone
    ? Math.round((player.visionCone.angleRad * 180) / Math.PI)
    : 0;
  const spreadDeg = player.visionCone
    ? Math.round((player.visionCone.spreadRad * 180) / Math.PI)
    : 60;

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Eye size={14} className="text-blue-400" />
          Vision Cone
        </span>
        <button
          type="button"
          onClick={toggleVisionCone}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
            hasVisionCone
              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
              : 'bg-white/10 text-white/50 hover:text-white'
          }`}
        >
          {hasVisionCone ? 'ON' : 'OFF'}
        </button>
      </div>

      {hasVisionCone && player.visionCone ? (
        <div className="space-y-3 pt-1">
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-200/90 leading-tight">
            💡 Drag vision cone handles directly on canvas to adjust direction,
            length, and spread angle.
          </div>
          <RangeInput
            label="Direction (°)"
            value={angleDeg}
            min={0}
            max={360}
            step={5}
            onChange={(deg) =>
              updateVisionCone({ angleRad: (deg * Math.PI) / 180 })
            }
          />
          <RangeInput
            label="Spread Angle (°)"
            value={spreadDeg}
            min={20}
            max={120}
            step={5}
            onChange={(deg) =>
              updateVisionCone({ spreadRad: (deg * Math.PI) / 180 })
            }
          />
          <RangeInput
            label="Length"
            value={player.visionCone.radius}
            min={10}
            max={60}
            step={2}
            onChange={(rad) => updateVisionCone({ radius: rad })}
          />
          <Row label="Color">
            <ColorInput
              value={player.visionCone.color}
              onChange={(c) => updateVisionCone({ color: c })}
            />
          </Row>
          <RangeInput
            label="Opacity"
            value={player.visionCone.opacity}
            min={0.1}
            max={0.8}
            step={0.05}
            onChange={(op) => updateVisionCone({ opacity: op })}
          />
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-white/40">
          Click &quot;ON&quot; to activate player vision cone
        </div>
      )}
    </div>
  );
}
