'use client';

import { Lock, Trash2, Unlock } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';
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
      {/* ゾーン色 */}
      <MiniColorPicker
        value={zone.color ?? '#f59e0b'}
        onChange={(color) => {
          updateZone(zone.id, { color });
        }}
        title="ゾーンの色"
      />

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 不透明度切替 */}
      <button
        type="button"
        onClick={() => {
          const cur = zone.opacity ?? 0.25;
          const next =
            cur < 0.25 ? 0.35 : cur < 0.45 ? 0.6 : cur < 0.7 ? 0.15 : 0.25;
          updateZone(zone.id, { opacity: next });
        }}
        className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer font-mono"
        title="不透明度 (クリックで切替)"
      >
        {Math.round((zone.opacity ?? 0.25) * 100)}%
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => updateZone(zone.id, { locked: !zone.locked })}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          zone.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={zone.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {zone.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

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
