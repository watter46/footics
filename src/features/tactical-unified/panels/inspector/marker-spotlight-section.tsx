'use client';

import { Sparkles } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { ColorInput } from './common-color-input';
import { RangeInput, Row } from './inspector-shared-controls';

export interface MarkerSpotlightSectionProps {
  player: Player;
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
}

export function MarkerSpotlightSection({
  player,
  slideId,
  updatePlayer,
}: MarkerSpotlightSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={14} className="text-yellow-400" />
          Focus (Spotlight)
        </span>
        <button
          type="button"
          onClick={() => {
            const nextEnabled = !(player.focus?.enabled ?? false);
            up({
              focus: {
                enabled: nextEnabled,
                color: player.focus?.color ?? '#ffffff',
                radius: player.focus?.radius ?? 3,
                opacity: player.focus?.opacity ?? 0.35,
                style: player.focus?.style ?? 'spotlight',
              },
            });
          }}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
            player.focus?.enabled
              ? 'bg-yellow-500 text-black shadow-sm ring-1 ring-yellow-300'
              : 'bg-white/10 text-white/50 hover:text-white'
          }`}
        >
          {player.focus?.enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {player.focus?.enabled ? (
        <div className="space-y-3 pt-1">
          <div className="p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-[11px] text-yellow-200/90 leading-tight">
            💡 Highlight key players with spotlight focus effect.
          </div>

          <Row label="Spotlight Color">
            <ColorInput
              value={player.focus.color ?? '#ffffff'}
              onChange={(c) =>
                up({
                  focus: {
                    ...(player.focus ?? {
                      enabled: true,
                      radius: 3,
                      opacity: 0.35,
                      style: 'spotlight',
                    }),
                    color: c,
                  },
                })
              }
            />
          </Row>

          <RangeInput
            label="Spotlight Radius"
            value={player.focus.radius ?? 3}
            min={1}
            max={6}
            step={0.5}
            onChange={(rad) =>
              up({
                focus: {
                  ...(player.focus ?? {
                    enabled: true,
                    color: '#ffffff',
                    opacity: 0.35,
                    style: 'spotlight',
                  }),
                  radius: rad,
                },
              })
            }
          />

          <RangeInput
            label="Intensity (Opacity)"
            value={player.focus.opacity ?? 0.35}
            min={0.1}
            max={0.8}
            step={0.05}
            onChange={(op) =>
              up({
                focus: {
                  ...(player.focus ?? {
                    enabled: true,
                    color: '#ffffff',
                    radius: 3,
                    style: 'spotlight',
                  }),
                  opacity: op,
                },
              })
            }
          />
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-white/40">
          Click &quot;ON&quot; to activate spotlight focus
        </div>
      )}
    </div>
  );
}
