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
import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import { MiniColorPicker } from './mini-color-picker';

export interface ZoneStrokePopoverProps {
  zone: DomainZoneAnnotation;
  updateZone: (id: string, patch: Partial<DomainZoneAnnotation>) => void;
}

export function ZoneStrokePopover({
  zone,
  updateZone,
}: ZoneStrokePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
  ]);

  const strokeWidth = zone.strokeWidth ?? 3;
  const strokeColor = zone.strokeColor ?? zone.color ?? '#f59e0b';
  const strokeOpacity = zone.strokeOpacity ?? 1;

  return (
    <div className="relative flex items-center">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className={`p-1 rounded-md transition-colors cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-white/[0.15] text-white'
            : 'text-white/80 hover:text-white hover:bg-white/[0.08]'
        }`}
        title="枠線設定"
        aria-label="枠線設定"
      >
        <div
          className="w-3.5 h-3.5 rounded-xs flex items-center justify-center"
          style={{
            borderStyle: strokeWidth === 0 ? 'dashed' : 'solid',
            borderColor: strokeColor,
            opacity: strokeWidth === 0 ? 0.4 : strokeOpacity,
            borderWidth:
              strokeWidth === 0 ? 1 : Math.max(1.5, Math.min(3, strokeWidth)),
          }}
        />
      </button>

      {isOpen && (
        <div
          ref={refs.setFloating}
          {...getFloatingProps()}
          role="dialog"
          aria-label="枠線設定"
          tabIndex={-1}
          className="p-3 bg-[#222226] border border-white/[0.08] rounded-xl shadow-2xl z-50 flex flex-col gap-2.5 w-48"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            ...floatingStyles,
            backgroundColor: '#222226',
            borderColor: 'rgba(255, 255, 255, 0.08)',
          }}
        >
          {/* 枠線太さ */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/60">太さ</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  strokeWidth > 0 &&
                  updateZone(zone.id, { strokeWidth: strokeWidth - 1 })
                }
                disabled={strokeWidth <= 0}
                className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
                title="枠線を細く"
              >
                <Minus size={11} />
              </button>
              <span className="text-[11px] font-mono text-white/90 min-w-[20px] text-center">
                {strokeWidth}px
              </span>
              <button
                type="button"
                onClick={() =>
                  strokeWidth < 8 &&
                  updateZone(zone.id, { strokeWidth: strokeWidth + 1 })
                }
                disabled={strokeWidth >= 8}
                className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
                title="枠線を太く"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-white/[0.08]" />

          {/* 枠線色 */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-white/60">カラー</span>
            <MiniColorPicker
              value={strokeColor}
              onChange={(c) => updateZone(zone.id, { strokeColor: c })}
              title="枠線の色"
            />
          </div>

          <div className="w-full h-px bg-white/[0.08]" />

          {/* 枠線不透明度 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/60">不透明度</span>
              <button
                type="button"
                onClick={() => {
                  const next =
                    strokeOpacity < 0.25
                      ? 0.5
                      : strokeOpacity < 0.6
                        ? 0.75
                        : strokeOpacity < 0.9
                          ? 1
                          : 0.25;
                  updateZone(zone.id, { strokeOpacity: next });
                }}
                className="text-[11px] font-mono text-white/90 hover:text-white cursor-pointer px-1 py-0.5 rounded bg-white/[0.04]"
                title="クリックで切替"
              >
                {Math.round(strokeOpacity * 100)}%
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={strokeOpacity}
              onChange={(e) =>
                updateZone(zone.id, {
                  strokeOpacity: Number.parseFloat(e.target.value),
                })
              }
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF8100]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
