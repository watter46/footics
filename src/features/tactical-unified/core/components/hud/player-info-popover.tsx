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
import { UserCog } from 'lucide-react';
import { useState } from 'react';
import type { Player } from '@/lib/types/tactical-unified';

export interface PlayerInfoPopoverProps {
  player: Player;
  isRing: boolean;
  updateMarker: (id: string, patch: Partial<Player>) => void;
}

export function PlayerInfoPopover({
  player,
  isRing,
  updateMarker,
}: PlayerInfoPopoverProps) {
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

  const currentBottomLabel = player.style?.bottomLabel ?? 'name';
  const isTransparentBg = player.style?.transparentBackground ?? false;

  return (
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
                });
              }}
              placeholder="選手名 (例: Saka)"
              className="w-full bg-[#121214] border border-white/[0.08] text-white px-2 py-1 rounded text-xs focus:outline-none focus:border-[#FF8100]"
              maxLength={20}
              aria-label="選手名"
            />
          </div>

          {/* Bottom Label トグル (Name / Num / None) */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-white/60">ラベル表示</label>
            <div className="grid grid-cols-3 gap-1 bg-[#121214] p-0.5 rounded border border-white/[0.08]">
              {(['name', 'number', 'none'] as const).map((mode) => {
                const labelText =
                  mode === 'name' ? 'Name' : mode === 'number' ? 'Num' : 'None';
                const isActive = currentBottomLabel === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-label={`ラベル ${labelText}`}
                    onClick={() => {
                      updateMarker(player.id, {
                        style: { ...player.style, bottomLabel: mode },
                      });
                    }}
                    className={`py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#FF8100] text-white font-semibold'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    {labelText}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 背景塗り切替 (!isRing 時のみ) */}
          {!isRing && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-white/60">マーカー背景</label>
              <button
                type="button"
                aria-label="背景塗り切替"
                onClick={() => {
                  updateMarker(player.id, {
                    style: {
                      ...player.style,
                      transparentBackground: !isTransparentBg,
                    },
                  });
                }}
                className={`w-full py-1 px-2 text-[10px] font-medium rounded border transition-colors cursor-pointer flex items-center justify-between ${
                  isTransparentBg
                    ? 'bg-white/10 border-white/20 text-white/90'
                    : 'bg-[#121214] border-white/[0.08] text-white/70 hover:bg-white/[0.04]'
                }`}
              >
                <span>背景の塗りつぶし</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    isTransparentBg
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {isTransparentBg ? '背景なし (透明)' : '塗りあり'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
