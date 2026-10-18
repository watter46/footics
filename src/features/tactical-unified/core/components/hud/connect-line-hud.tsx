'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { DashedLineIcon, SolidLineIcon } from './hud-icons';
import { MiniColorPicker } from './mini-color-picker';

export interface ConnectLineHudProps {
  connectLineId: string;
  parentPlayerId?: string;
}

export function ConnectLineHud({
  connectLineId,
  parentPlayerId,
}: ConnectLineHudProps) {
  const markers = useCanvasStore((s) => s.annotations.markers);
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  const parent = parentPlayerId
    ? markers.find((m) => m.id === parentPlayerId)
    : markers.find((m) => m.connectLines?.some((c) => c.id === connectLineId));

  const cl = parent?.connectLines?.find((c) => c.id === connectLineId);

  if (!parent || !cl) return null;

  const isDashed = cl.lineStyle === 'dashed';

  const updateLine = (patch: Partial<typeof cl>) => {
    updateMarker(parent.id, {
      connectLines: (parent.connectLines ?? []).map((c) =>
        c.id === connectLineId ? { ...c, ...patch } : c,
      ),
    });
  };

  const removeLine = () => {
    updateMarker(parent.id, {
      connectLines: (parent.connectLines ?? []).filter(
        (c) => c.id !== connectLineId,
      ),
    });
    clearSelection();
  };

  return (
    <>
      {/* 実線 / 点線 切替 */}
      <button
        type="button"
        onClick={() => {
          updateLine({
            lineStyle: isDashed ? 'solid' : 'dashed',
          });
        }}
        className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title={isDashed ? '点線 (実線に切替)' : '実線 (点線に切替)'}
      >
        {isDashed ? <DashedLineIcon size={14} /> : <SolidLineIcon size={14} />}
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 線の太さ */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = cl.strokeWidth ?? 2;
            if (cur > 1) updateLine({ strokeWidth: cur - 1 });
          }}
          disabled={(cl.strokeWidth ?? 2) <= 1}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="線を細く"
        >
          <Minus size={11} />
        </button>
        <span className="text-[11px] font-mono text-white/90 min-w-[20px] text-center">
          {cl.strokeWidth ?? 2}px
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = cl.strokeWidth ?? 2;
            if (cur < 8) updateLine({ strokeWidth: cur + 1 });
          }}
          disabled={(cl.strokeWidth ?? 2) >= 8}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="線を太く"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 線の色 */}
      <MiniColorPicker
        value={cl.color ?? '#38bdf8'}
        onChange={(color) => updateLine({ color })}
        title="コネクトラインの色"
      />

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 削除 */}
      <button
        type="button"
        onClick={removeLine}
        className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-colors cursor-pointer"
        title="削除"
      >
        <Trash2 size={13} />
      </button>
    </>
  );
}
