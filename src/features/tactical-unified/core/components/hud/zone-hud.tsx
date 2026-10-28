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
import {
  Circle,
  Lock,
  Minus,
  Plus,
  Square,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useState } from 'react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import { MiniColorPicker } from './mini-color-picker';

interface ZoneStrokePopoverProps {
  zone: ZoneAnnotation;
  updateZone: (id: string, patch: Partial<ZoneAnnotation>) => void;
}

function ZoneStrokePopover({ zone, updateZone }: ZoneStrokePopoverProps) {
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
                onClick={() => {
                  if (strokeWidth > 0) {
                    updateZone(zone.id, { strokeWidth: strokeWidth - 1 });
                  }
                }}
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
                onClick={() => {
                  if (strokeWidth < 8) {
                    updateZone(zone.id, { strokeWidth: strokeWidth + 1 });
                  }
                }}
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

      {/* 不透明度切替 (塗り) */}
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
        title="塗りの不透明度 (クリックで切替)"
      >
        {Math.round((zone.opacity ?? 0.25) * 100)}%
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 枠線専用ポップオーバー (太さ・色・不透明度) */}
      <ZoneStrokePopover zone={zone} updateZone={updateZone} />

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
