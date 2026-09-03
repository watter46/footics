'use client';

import {
  ArrowDownLeft,
  Circle,
  Hash,
  Image as ImageIcon,
  Plus,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { ColorInput } from '../common-color-input';
import {
  DeleteButton,
  RangeInput,
  Row,
  TextInput,
} from './inspector-shared-controls';
import { PlayerMarkerOptionsSection } from './player-marker-options-section';

export function MultiPlayerInspector({
  players,
  slideId,
  updatePlayer,
  removePlayer,
  clearSelection,
}: {
  players: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  removePlayer: (s: string, id: string) => void;
  clearSelection: () => void;
}) {
  const handleBatchInsideContent = (
    insideContent: Player['style']['insideContent'],
  ) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, insideContent },
      });
    });
  };

  const handleBatchBottomLabel = (
    bottomLabel: Player['style']['bottomLabel'],
  ) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, bottomLabel },
      });
    });
  };

  const handleBatchColor = (color: string) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, color },
      });
    });
  };

  const handleBatchSizeScale = (sizeScale: number) => {
    players.forEach((p) => {
      updatePlayer(slideId, p.id, {
        style: { ...p.style, sizeScale },
      });
    });
  };

  const handleRemoveAll = () => {
    players.forEach((p) => {
      removePlayer(slideId, p.id);
    });
    clearSelection();
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4 text-white select-none custom-scrollbar">
      <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-200">
        <span className="font-bold">{players.length} players selected</span>
        <p className="text-[11px] text-white/50 mt-0.5">
          Changes applied here will update all selected players simultaneously.
        </p>
      </div>

      <div className="space-y-3.5 p-3 rounded-xl bg-white/[0.03] border border-white/10">
        <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={13} className="text-amber-400" />
          Batch Appearance
        </span>

        <Row label="Inside Marker Content">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-black/40 border border-white/10">
            <button
              type="button"
              onClick={() => handleBatchInsideContent('number')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Hash size={15} />
              <span className="text-[10px] mt-1 font-medium">Number</span>
            </button>
            {players.some((p) => Boolean(p.style.photoUrl)) ? (
              <button
                type="button"
                onClick={() => handleBatchInsideContent('photo')}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ImageIcon size={15} />
                <span className="text-[10px] mt-1 font-medium">Photo</span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="flex flex-col items-center justify-center py-2 px-1 rounded-md opacity-30 text-white/40 cursor-not-allowed"
                title="No photos configured on selected players"
              >
                <ImageIcon size={15} />
                <span className="text-[10px] mt-1 font-medium">Photo</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBatchInsideContent('none')}
              className="flex flex-col items-center justify-center py-2 px-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Circle size={15} />
              <span className="text-[10px] mt-1 font-medium">Empty</span>
            </button>
          </div>
        </Row>

        <Row label="Bottom Label Display">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/10">
            {(['name', 'number', 'none'] as const).map((lbl) => (
              <button
                key={lbl}
                type="button"
                onClick={() => handleBatchBottomLabel(lbl)}
                className="py-1.5 px-1 rounded-md text-[10px] font-medium uppercase text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                {lbl === 'none' ? 'Hidden' : lbl}
              </button>
            ))}
          </div>
        </Row>

        <Row label="Player Color">
          <ColorInput
            value={players[0]?.style.color || '#3b82f6'}
            onChange={handleBatchColor}
          />
        </Row>

        <RangeInput
          label="Marker Size"
          value={players[0]?.style.sizeScale ?? 1.0}
          min={0.6}
          max={1.6}
          step={0.1}
          onChange={handleBatchSizeScale}
        />
      </div>

      <DeleteButton
        onClick={handleRemoveAll}
        label={`Delete ${players.length} Players`}
      />
    </div>
  );
}

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

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-slate-200 custom-scrollbar">
      {/* ── Quick Style & Controls (HUD 同等機能) ── */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">
            {player.style.markerType === 'ring'
              ? 'Ring Settings'
              : 'Quick Settings'}
          </span>
          {/* マーカー形状切替 (2Dサークル / 3Dリング) */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10">
            <button
              type="button"
              onClick={() => upStyle({ markerType: 'circle' })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                (player.style.markerType ?? 'circle') === 'circle'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Circle
            </button>
            <button
              type="button"
              onClick={() => upStyle({ markerType: 'ring' })}
              className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                player.style.markerType === 'ring'
                  ? 'bg-blue-600 text-white font-bold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              Ring
            </button>
          </div>
        </div>

        {player.style.markerType !== 'ring' && (
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

        {player.style.markerType !== 'ring' && (
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

      {/* ── Player Header & Bench/Pitch Jump (Ring ではない通常の選手マーカーの場合のみ表示) ── */}
      {player.style.markerType !== 'ring' && (
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

      {/* ── Delete Button ── */}
      <DeleteButton
        onClick={onRemove}
        label={
          player.style.markerType === 'ring' ? 'Delete Ring' : 'Delete Player'
        }
      />
    </div>
  );
}
