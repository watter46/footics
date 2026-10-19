'use client';

import { Circle, Hash, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { Player } from '@/lib/types/tactical-unified';
import { ColorInput } from './common-color-input';
import { DeleteButton, RangeInput, Row } from './inspector-shared-controls';

export interface MultiPlayerInspectorProps {
  players: Player[];
  slideId: string;
  updatePlayer: (s: string, id: string, p: Partial<Player>) => void;
  removePlayer: (s: string, id: string) => void;
  clearSelection: () => void;
}

export function MultiPlayerInspector({
  players,
  slideId,
  updatePlayer,
  removePlayer,
  clearSelection,
}: MultiPlayerInspectorProps) {
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
