'use client';

import {
  Circle,
  Lock,
  Minus,
  Plus,
  Square,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import { MiniColorPicker } from './mini-color-picker';

export interface ZoneHudProps {
  zoneId: string;
}

export function ZoneHud({ zoneId }: ZoneHudProps) {
  const zone = useCanvasStore((s) =>
    s.annotations.zones.find((z) => z.id === zoneId),
  );
  const updateZone = useCanvasStore((s) => s.updateZone);
  const removeZone = useCanvasStore((s) => s.removeZone);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  if (!zone) return null;

  return (
    <>
      {/* 形状切替 (四角形 ↔ 円/楕円) */}
      {zone.shapeType !== 'polygon' && (
        <>
          <button
            type="button"
            onClick={() => {
              const nextType =
                zone.shapeType === 'ellipse' ? 'rect' : 'ellipse';
              updateZone(zone.id, { shapeType: nextType });
            }}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            title={
              zone.shapeType === 'ellipse'
                ? '円/楕円 (四角形に切替)'
                : '四角形 (円/楕円に切替)'
            }
          >
            {zone.shapeType === 'ellipse' ? (
              <Circle size={14} />
            ) : (
              <Square size={14} />
            )}
          </button>
          <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />
        </>
      )}

      {/* ゾーン色 */}
      <MiniColorPicker
        value={zone.color ?? '#ef4444'}
        onChange={(color) => {
          updateZone(zone.id, { color });
        }}
        title="ゾーンの色"
      />

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 枠線の太さ */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = zone.strokeWidth ?? 2;
            if (cur > 0) {
              updateZone(zone.id, { strokeWidth: cur - 1 });
            }
          }}
          disabled={(zone.strokeWidth ?? 2) <= 0}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="枠線を細く"
        >
          <Minus size={11} />
        </button>
        <span className="text-[11px] font-mono text-white/90 min-w-[20px] text-center">
          {zone.strokeWidth ?? 2}px
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = zone.strokeWidth ?? 2;
            if (cur < 8) {
              updateZone(zone.id, { strokeWidth: cur + 1 });
            }
          }}
          disabled={(zone.strokeWidth ?? 2) >= 8}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="枠線を太く"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 枠線の色 */}
      <MiniColorPicker
        value={zone.strokeColor ?? zone.color ?? '#f59e0b'}
        onChange={(strokeColor) => {
          updateZone(zone.id, { strokeColor });
        }}
        title="枠線の色"
      />

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 不透明度切替 */}
      <button
        type="button"
        onClick={() => {
          const cur = zone.opacity ?? 0.25;
          const next =
            cur < 0.25 ? 0.35 : cur < 0.45 ? 0.6 : cur < 0.7 ? 0.15 : 0.25;
          updateZone(zone.id, { opacity: next });
        }}
        style={{ backgroundColor: '#222226', color: '#ffffff' }}
        className="px-1.5 py-0.5 rounded bg-[#222226] border border-white/[0.08] text-[11px] text-white/80 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer font-mono"
        title="不透明度 (クリックで切替)"
      >
        {Math.round((zone.opacity ?? 0.25) * 100)}%
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => updateZone(zone.id, { locked: !zone.locked })}
        style={
          zone.locked
            ? { backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          zone.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={zone.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {zone.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          removeZone(zone.id);
          clearSelection();
        }}
        className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
        title="削除 (Delete)"
      >
        <Trash2 size={13} />
      </button>
    </>
  );
}
