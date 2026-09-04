'use client';

import { Lock, Minus, Plus, Trash2, Unlock } from 'lucide-react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { DashedLineIcon, SolidLineIcon } from './hud-icons';
import { MiniColorPicker } from './mini-color-picker';

export interface ArrowHudProps {
  arrowId: string;
}

export function ArrowHud({ arrowId }: ArrowHudProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const updateArrow = useTacticalUnifiedStore((s) => s.updateArrow);
  const removeArrow = useTacticalUnifiedStore((s) => s.removeArrow);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const toggleObjectLock = useTacticalUnifiedStore((s) => s.toggleObjectLock);

  const arrow = activeSlide?.arrows.find((a) => a.id === arrowId);
  if (!arrow) return null;

  const isDashed = arrow.dashArray && arrow.dashArray.length > 0;

  return (
    <>
      {/* 実線 / 点線 切替 */}
      <button
        type="button"
        onClick={() => {
          updateArrow(activeSlideId, arrow.id, {
            dashArray: isDashed ? [] : [6, 4],
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
            const cur = arrow.strokeWidth ?? 3;
            if (cur > 1) {
              updateArrow(activeSlideId, arrow.id, {
                strokeWidth: cur - 1,
              });
            }
          }}
          disabled={(arrow.strokeWidth ?? 3) <= 1}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="線を細く"
        >
          <Minus size={11} />
        </button>
        <span className="text-[11px] font-mono text-white/90 min-w-[20px] text-center">
          {arrow.strokeWidth ?? 3}px
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = arrow.strokeWidth ?? 3;
            if (cur < 10) {
              updateArrow(activeSlideId, arrow.id, {
                strokeWidth: cur + 1,
              });
            }
          }}
          disabled={(arrow.strokeWidth ?? 3) >= 10}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="線を太く"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 線の色 */}
      <MiniColorPicker
        value={arrow.color ?? '#ffffff'}
        onChange={(color) => {
          updateArrow(activeSlideId, arrow.id, { color });
        }}
        title="線の色"
      />

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => toggleObjectLock(arrow.id, 'arrow')}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          arrow.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={arrow.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {arrow.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          removeArrow(activeSlideId, arrow.id);
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
