'use client';

import { ArrowDownLeft, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { ColorInput } from './common-color-input';
import {
  DeleteButton,
  RangeInput,
  Row,
  TextInput,
} from './inspector-shared-controls';
import { PlayerMarkerOptionsSection } from './player-marker-options-section';

export function PlayerInspector({
  player,
  allPlayers,
  slideId,
  updatePlayer,
  addArrow,
  onRemove,
}: {
  player: Player;
  allPlayers: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  addArrow: (s: string, arrow: ArrowAnnotation) => void;
  onRemove: () => void;
}) {
  const up = (p: Partial<Player>) => updatePlayer(slideId, player.id, p);
  const upStyle = (s: Partial<Player['style']>) =>
    up({ style: { ...player.style, ...s } });

  const movePlayerToBench = useTacticalUnifiedStore((s) => s.movePlayerToBench);
  const movePlayerToPitch = useTacticalUnifiedStore((s) => s.movePlayerToPitch);
  const setRightPanelTab = useTacticalUnifiedStore((s) => s.setRightPanelTab);

  const [newBadgeText, setNewBadgeText] = useState('');

  const isRing = player.style.markerType === 'ring';

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-slate-200 custom-scrollbar">
      {/* ── Quick Style & Controls (HUD 同等機能) ── */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            {isRing ? 'Ring Settings' : 'Quick Settings'}
          </span>
        </div>

        {!isRing && (
          <Row label="Shirt Number">
            <TextInput
              value={player.shirtNo ?? ''}
              onChange={(v) => up({ shirtNo: v })}
              maxLength={3}
              placeholder="-"
            />
          </Row>
        )}

        <Row label="Main Color">
          <ColorInput
            value={player.style.color || '#3b82f6'}
            onChange={(v) => upStyle({ color: v })}
          />
        </Row>

        {!isRing && (
          <Row label="Border Color">
            <ColorInput
              value={player.style.strokeColor || '#ffffff'}
              onChange={(v) => upStyle({ strokeColor: v })}
            />
          </Row>
        )}

        <RangeInput
          label="Marker Scale"
          value={player.style.sizeScale ?? 1.0}
          min={0.4}
          max={2.0}
          step={0.1}
          onChange={(v) => upStyle({ sizeScale: v })}
        />
      </div>

      {/* ── Player Header & Bench/Pitch Jump (サークル選手時のみ表示) ── */}
      {!isRing && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-white/30"
              style={{ backgroundColor: player.style.color || '#3b82f6' }}
            >
              {player.shirtNo || '•'}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">
                {player.name || `Player ${player.shirtNo || ''}`}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {player.area === 'pitch'
                  ? 'On Pitch (Placed)'
                  : 'Substitute (Bench)'}
              </span>
            </div>
          </div>

          {player.area === 'pitch' ? (
            <button
              type="button"
              onClick={() => {
                movePlayerToBench(slideId, player.id);
                setRightPanelTab('squad');
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
              title="Move player from pitch to bench"
            >
              <ArrowDownLeft size={12} />
              <span>Send to Bench</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                movePlayerToPitch(slideId, player.id, 50, 50);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-300 text-[10px] font-bold transition-all cursor-pointer shadow-sm"
              title="Place player on pitch"
            >
              <Plus size={12} />
              <span>Place on Pitch</span>
            </button>
          )}
        </div>
      )}

      {/* ── Marker Option Tabs & Sub-controls ── */}
      <PlayerMarkerOptionsSection
        player={player}
        allPlayers={allPlayers}
        slideId={slideId}
        updatePlayer={updatePlayer}
        addArrow={addArrow}
        newBadgeText={newBadgeText}
        setNewBadgeText={setNewBadgeText}
      />

      <DeleteButton
        onClick={onRemove}
        label={isRing ? 'Delete Ring' : 'Delete Player'}
      />
    </div>
  );
}
