'use client';

import { Link, Plus, Trash2 } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Player } from '@/lib/types/tactical-unified';
import { ColorInput } from './common-color-input';
import { Row } from './inspector-shared-controls';

export interface MarkerConnectorSectionProps {
  player: Player;
  allPlayers: Player[];
  slideId: string;
  updatePlayer: (slideId: string, id: string, p: Partial<Player>) => void;
}

export function MarkerConnectorSection({
  player,
  allPlayers,
  slideId,
  updatePlayer,
}: MarkerConnectorSectionProps) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);

  const connectingPlayerId = useTacticalUnifiedStore(
    (s) => s.connectingPlayerId,
  );
  const setConnectingPlayerId = useTacticalUnifiedStore(
    (s) => s.setConnectingPlayerId,
  );
  const isConnecting = connectingPlayerId === player.id;

  const removeConnectLine = (lineId: string) => {
    up({ connectLines: player.connectLines.filter((l) => l.id !== lineId) });
  };

  return (
    <div className="space-y-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
          <Link size={14} className="text-emerald-400" />
          Player Connectors
        </span>
        <button
          type="button"
          onClick={() => {
            if (isConnecting) {
              setConnectingPlayerId(null);
            } else {
              setConnectingPlayerId(player.id);
            }
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
            isConnecting
              ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400 animate-pulse'
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
          }`}
        >
          <Plus size={12} />
          {isConnecting ? 'Selecting...' : 'Add Link'}
        </button>
      </div>

      {isConnecting && (
        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center justify-between">
          <span className="text-[11px] font-medium leading-tight">
            Click a target player on pitch
          </span>
          <button
            type="button"
            onClick={() => setConnectingPlayerId(null)}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-white shrink-0 ml-2 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {player.connectLines.length > 0 ? (
        <div className="space-y-2">
          {player.connectLines.map((line) => {
            const target = allPlayers.find((p) => p.id === line.toPlayerId);
            return (
              <div
                key={line.id}
                className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90 truncate flex items-center gap-1">
                    <Link size={12} className="text-emerald-400 shrink-0" />
                    <span>
                      → {target?.name || `Player #${target?.shirtNo || '?'}`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeConnectLine(line.id)}
                    className="p-1 rounded hover:bg-white/10 text-red-400 hover:text-red-300 cursor-pointer"
                    title="Delete connector"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-[10px] text-white/50">Line Style</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextStyle =
                        line.lineStyle === 'dashed' ? 'solid' : 'dashed';
                      up({
                        connectLines: player.connectLines.map((l) =>
                          l.id === line.id ? { ...l, lineStyle: nextStyle } : l,
                        ),
                      });
                    }}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] text-white/80 cursor-pointer"
                  >
                    {line.lineStyle === 'dashed' ? 'Dashed' : 'Solid'}
                  </button>
                </div>

                <Row label="Color">
                  <ColorInput
                    value={line.color || player.style.color || '#3b82f6'}
                    onChange={(c) => {
                      up({
                        connectLines: player.connectLines.map((l) =>
                          l.id === line.id ? { ...l, color: c } : l,
                        ),
                      });
                    }}
                  />
                </Row>
              </div>
            );
          })}
        </div>
      ) : (
        !isConnecting && (
          <div className="py-6 text-center text-xs text-white/40">
            Click &quot;+ Add Link&quot; to connect to another player
          </div>
        )
      )}
    </div>
  );
}
