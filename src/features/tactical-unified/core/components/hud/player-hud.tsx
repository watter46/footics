'use client';

import { Lock, Minus, Plus, Trash2, Unlock } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';
import { MiniColorPicker } from './mini-color-picker';

export interface PlayerHudProps {
  playerId: string;
}

export function PlayerHud({ playerId }: PlayerHudProps) {
  const player = useCanvasStore((s) =>
    s.annotations.markers.find((p) => p.id === playerId),
  );
  const updateMarker = useCanvasStore((s) => s.updateMarker);
  const removeMarker = useCanvasStore((s) => s.removeMarker);
  const clearSelection = useCanvasStore((s) => s.clearSelection);

  if (!player) return null;

  const isRing = player.style?.markerType === 'ring';
  const currentScale = player.style?.sizeScale ?? 1.0;

  return (
    <>
      {/* 1. 背番号入力 (サークルマーカー時のみ表示) */}
      {!isRing && (
        <>
          <div className="flex items-center bg-white/10 rounded-md px-1.5 py-0.5 text-xs text-white">
            <span className="text-white/40 font-semibold text-[10px] select-none mr-1">
              #
            </span>
            <input
              type="text"
              value={player.shirtNo ?? ''}
              onChange={(e) => {
                updateMarker(player.id, { shirtNo: e.target.value });
              }}
              className="w-6 bg-transparent text-white font-mono text-xs text-center focus:outline-none focus:bg-white/10 rounded"
              maxLength={3}
              placeholder="-"
              title="背番号"
              aria-label="背番号"
            />
          </div>
          <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />
        </>
      )}

      {/* 2. メインカラー */}
      <MiniColorPicker
        value={player.style?.color ?? '#ef4444'}
        onChange={(color) => {
          updateMarker(player.id, {
            style: { ...player.style, color },
          });
        }}
        title="メインカラー"
      />

      {/* 3. 枠線カラー (サークルマーカー時のみ表示) */}
      {!isRing && (
        <MiniColorPicker
          value={player.style?.strokeColor ?? '#ffffff'}
          onChange={(strokeColor) => {
            updateMarker(player.id, {
              style: { ...player.style, strokeColor },
            });
          }}
          title="枠線カラー"
          isRing
        />
      )}

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 4. スケール変更 */}
      <div className="flex items-center bg-white/10 rounded-md px-1 py-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(0.6, Number((currentScale - 0.1).toFixed(1)));
            updateMarker(player.id, {
              style: { ...player.style, sizeScale: next },
            });
          }}
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="マーカースケール縮小 (-0.1)"
        >
          <Minus size={11} />
        </button>
        <span className="text-[10px] font-mono text-white/90 px-0.5 select-none">
          {currentScale.toFixed(1)}x
        </span>
        <button
          type="button"
          onClick={() => {
            const next = Math.min(2.0, Number((currentScale + 0.1).toFixed(1)));
            updateMarker(player.id, {
              style: { ...player.style, sizeScale: next },
            });
          }}
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="マーカースケール拡大 (+0.1)"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => updateMarker(player.id, { locked: !player.locked })}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          player.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={player.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {player.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          removeMarker(player.id);
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
