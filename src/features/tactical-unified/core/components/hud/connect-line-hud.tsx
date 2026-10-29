'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
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
        style={
          isDashed
            ? { backgroundColor: '#FF8100', color: '#ffffff' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          isDashed
            ? 'bg-[#FF8100] text-white'
            : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={isDashed ? '点線 (実線に切替)' : '実線 (点線に切替)'}
      >
        {isDashed ? <DashedLineIcon size={14} /> : <SolidLineIcon size={14} />}
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 線の太さ */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = cl.strokeWidth ?? 2;
            if (cur > 1) updateLine({ strokeWidth: cur - 1 });
          }}
          disabled={(cl.strokeWidth ?? 2) <= 1}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
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
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="線を太く"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 線の色 */}
      <MiniColorPicker
        value={cl.color ?? '#38bdf8'}
        onChange={(color) => updateLine({ color })}
        title="コネクトラインの色"
      />

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 発光幅 (Blur) */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = cl.glowBlur ?? 50;
            if (cur > 0) updateLine({ glowBlur: Math.max(0, cur - 5) });
          }}
          disabled={(cl.glowBlur ?? 50) <= 0}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="発光幅縮小"
          aria-label="発光幅縮小"
        >
          <Minus size={11} />
        </button>
        <span
          className="text-[11px] font-mono text-white/90 min-w-[24px] text-center"
          title="発光幅"
        >
          {cl.glowBlur ?? 50}px
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = cl.glowBlur ?? 50;
            if (cur < 100) updateLine({ glowBlur: Math.min(100, cur + 5) });
          }}
          disabled={(cl.glowBlur ?? 50) >= 100}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="発光幅拡大"
          aria-label="発光幅拡大"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 発光透明度 (Opacity) */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = cl.glowOpacity ?? 1.0;
            if (cur > 0) {
              updateLine({
                glowOpacity: Math.max(0, Number((cur - 0.1).toFixed(1))),
              });
            }
          }}
          disabled={(cl.glowOpacity ?? 1.0) <= 0}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="発光透明度縮小"
          aria-label="発光透明度縮小"
        >
          <Minus size={11} />
        </button>
        <span
          className="text-[11px] font-mono text-white/90 min-w-[28px] text-center"
          title="発光透明度"
        >
          {Math.round((cl.glowOpacity ?? 1.0) * 100)}%
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = cl.glowOpacity ?? 1.0;
            if (cur < 1.0) {
              updateLine({
                glowOpacity: Math.min(1.0, Number((cur + 0.1).toFixed(1))),
              });
            }
          }}
          disabled={(cl.glowOpacity ?? 1.0) >= 1.0}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="発光透明度拡大"
          aria-label="発光透明度拡大"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

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
