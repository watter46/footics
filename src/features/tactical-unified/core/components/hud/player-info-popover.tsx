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
  );
}
