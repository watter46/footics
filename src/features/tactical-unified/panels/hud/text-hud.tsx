'use client';

import { Lock, Minus, Plus, Trash2, Unlock } from 'lucide-react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { MiniColorPicker } from './mini-color-picker';

export interface TextHudProps {
  textId: string;
}

export function TextHud({ textId }: TextHudProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const updateText = useTacticalUnifiedStore((s) => s.updateText);
  const removeText = useTacticalUnifiedStore((s) => s.removeText);
  const clearSelection = useTacticalUnifiedStore((s) => s.clearSelection);
  const toggleObjectLock = useTacticalUnifiedStore((s) => s.toggleObjectLock);

  const text = activeSlide?.texts.find((t) => t.id === textId);
  if (!text) return null;

  return (
    <>
      {/* 文字サイズ */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = text.fontSize ?? 16;
            if (cur > 10) {
              updateText(activeSlideId, text.id, {
                fontSize: cur - 2,
              });
            }
          }}
          disabled={(text.fontSize ?? 16) <= 10}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="文字を小さく"
        >
          <Minus size={11} />
        </button>
        <span className="text-[11px] font-mono text-white/90 min-w-[24px] text-center">
          {text.fontSize ?? 16}px
        </span>
        <button
          type="button"
          onClick={() => {
            const cur = text.fontSize ?? 16;
            if (cur < 64) {
              updateText(activeSlideId, text.id, {
                fontSize: cur + 2,
              });
            }
          }}
          disabled={(text.fontSize ?? 16) >= 64}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 cursor-pointer"
          title="文字を大きく"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 文字色 */}
      <MiniColorPicker
        value={text.color ?? '#ffffff'}
        onChange={(color) => {
          updateText(activeSlideId, text.id, { color });
        }}
        title="文字色"
      />

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => toggleObjectLock(text.id, 'text')}
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          text.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/10'
        }`}
        title={text.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {text.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/15 mx-0.5 shrink-0" />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          removeText(activeSlideId, text.id);
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
