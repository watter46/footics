'use client';

import {
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
} from '@floating-ui/react';
import { Lock, Minus, Plus, Trash2, Unlock, UserCog } from 'lucide-react';
import { useState } from 'react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import { MiniColorPicker } from './mini-color-picker';
import { PlayerQuickActions } from './player-quick-actions';

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

  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const {
    refs: infoRefs,
    floatingStyles: infoFloatingStyles,
    context: infoContext,
  } = useFloating({
    open: isInfoOpen,
    onOpenChange: setIsInfoOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });
  const infoClick = useClick(infoContext);
  const infoDismiss = useDismiss(infoContext);
  const {
    getReferenceProps: getInfoReferenceProps,
    getFloatingProps: getInfoFloatingProps,
  } = useInteractions([infoClick, infoDismiss]);

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
          <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />
        </>
      )}

      {/* 2. メインカラー */}
      <MiniColorPicker
        value={player.style?.color ?? '#034694'}
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

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 4. スケール変更 */}
      <div className="flex items-center bg-[#18181B] border border-white/[0.08] rounded-md px-1 py-0.5 gap-0.5">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(0.6, Number((currentScale - 0.1).toFixed(1)));
            updateMarker(player.id, {
              style: { ...player.style, sizeScale: next },
            });
          }}
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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
          className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          title="マーカースケール拡大 (+0.1)"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 5. マーカーオプション群 (Vision Cone, Connect Line, 矢印, Spotlight) */}
      <PlayerQuickActions player={player} />

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => updateMarker(player.id, { locked: !player.locked })}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          player.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={player.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {player.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 6. 選手情報変更ボタン & ポップオーバー */}
      <div className="relative flex items-center">
        <button
          ref={infoRefs.setReference}
          {...getInfoReferenceProps()}
          type="button"
          className={`p-1 rounded-md transition-colors cursor-pointer ${
            isInfoOpen
              ? 'text-white bg-white/20'
              : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
          }`}
          title="選手情報変更"
          aria-label="選手情報変更"
        >
          <UserCog size={13} />
        </button>

        {isInfoOpen && (
          <div
            ref={infoRefs.setFloating}
            {...getInfoFloatingProps()}
            role="dialog"
            aria-label="選手情報変更フォーム"
            tabIndex={-1}
            className="p-2.5 bg-[#222226] border border-white/[0.08] rounded-xl shadow-2xl z-50 flex flex-col gap-2 w-48 text-xs text-white"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              ...infoFloatingStyles,
              width: 192,
              backgroundColor: '#222226',
              borderColor: 'rgba(255, 255, 255, 0.08)',
            }}
          >
            <div className="text-[11px] font-semibold text-white/70 border-b border-white/[0.08] pb-1">
              選手情報
            </div>
            {!isRing && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/60">背番号</label>
                <input
                  type="text"
                  value={player.shirtNo ?? ''}
                  onChange={(e) => {
                    updateMarker(player.id, { shirtNo: e.target.value });
                  }}
                  placeholder="背番号 (例: 10)"
                  className="w-full bg-[#121214] border border-white/[0.08] text-white px-2 py-1 rounded text-xs focus:outline-none focus:border-[#FF8100]"
                  maxLength={3}
                  aria-label="背番号"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/60">選手名</label>
              <input
                type="text"
                value={player.name ?? ''}
                onChange={(e) => {
                  const name = e.target.value;
                  updateMarker(player.id, {
                    name,
                    style: {
                      ...player.style,
                      bottomLabel: name ? 'name' : 'none',
                    },
                  });
                }}
                placeholder="選手名 (例: Saka)"
                className="w-full bg-[#121214] border border-white/[0.08] text-white px-2 py-1 rounded text-xs focus:outline-none focus:border-[#FF8100]"
                maxLength={20}
                aria-label="選手名"
              />
            </div>
          </div>
        )}
      </div>

      {/* 7. 削除ボタン (カスタム選手または Extension 3Dリングマーカー時のみ表示) */}
      {(isRing || Boolean(player.isCustom)) && (
        <>
          <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />
          <button
            type="button"
            onClick={() => {
              removeMarker(player.id);
              clearSelection();
            }}
            className="p-1 rounded-md text-white/50 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
            title="削除 (Delete)"
            aria-label="削除 (Delete)"
          >
            <Trash2 size={13} />
          </button>
        </>
      )}
    </>
  );
}
