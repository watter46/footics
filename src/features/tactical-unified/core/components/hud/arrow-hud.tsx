'use client';

import { Lock, Minus, Plus, Trash2, Unlock, Zap } from 'lucide-react';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import { DashedLineIcon, SolidLineIcon } from './hud-icons';
import { MiniColorPicker } from './mini-color-picker';

export interface ArrowHudProps {
  arrowId: string;
}

export function ArrowHud({ arrowId }: ArrowHudProps) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const clearSelection = useSessionStore((s) => s.clearSelection);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);

  const arrow = activeSlide?.arrows.find((a) => a.id === arrowId);

  if (!arrow || !activePhaseId || !activeSlideId) return null;

  const updateArrow = (patch: Partial<DomainArrowAnnotation>) => {
    dispatchSlide(activePhaseId, activeSlideId, {
      type: 'UPDATE_ARROW',
      id: arrow.id,
      patch,
    });
  };

  const isDashed = Boolean(arrow.dashArray && arrow.dashArray.length > 0);
  const isGrowEffect = arrow.effect?.type === 'grow';

  const toggleEffect = () => {
    if (isGrowEffect) {
      updateArrow({
        effect: {
          ...(arrow.effect ?? {
            delay: 0.5,
            duration: 0.8,
            holdDuration: 0.5,
            exitAction: 'keep',
            fadeDuration: 0.3,
            easing: 'ease-out',
          }),
          type: 'none',
        },
      });
    } else {
      updateArrow({
        effect: {
          type: 'grow',
          delay: arrow.effect?.delay ?? 0.5,
          duration: arrow.effect?.duration ?? 0.8,
          holdDuration: arrow.effect?.holdDuration ?? 0.5,
          exitAction: arrow.effect?.exitAction ?? 'keep',
          fadeDuration: arrow.effect?.fadeDuration ?? 0.3,
          easing: arrow.effect?.easing ?? 'ease-out',
        },
      });
    }
  };

  return (
    <>
      {/* 伸長エフェクト トグル (⚡️) */}
      <button
        type="button"
        onClick={toggleEffect}
        style={
          isGrowEffect
            ? { backgroundColor: '#FF8100', color: '#ffffff' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          isGrowEffect
            ? 'bg-[#FF8100] text-white shadow-sm'
            : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={isGrowEffect ? 'エフェクト解除 (⚡️)' : '伸長エフェクト (⚡️)'}
        aria-label={isGrowEffect ? 'エフェクト解除' : '伸長エフェクト'}
      >
        <Zap size={13} className={isGrowEffect ? 'fill-current' : undefined} />
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 実線 / 点線 切替 */}
      <button
        type="button"
        onClick={() => {
          updateArrow({
            dashArray: isDashed ? [] : [6, 4],
          });
        }}
        style={
          isDashed
            ? { backgroundColor: '#FF8100', color: '#ffffff' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          isDashed
            ? 'bg-[#FF8100] text-white'
            : 'text-white/70 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={isDashed ? '点線 (実線に切替)' : '実線 (点線に切替)'}
      >
        {isDashed ? <DashedLineIcon size={14} /> : <SolidLineIcon size={14} />}
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 線の太さ */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => {
            const cur = arrow.strokeWidth ?? 3;
            if (cur > 1) {
              updateArrow({ strokeWidth: cur - 1 });
            }
          }}
          disabled={(arrow.strokeWidth ?? 3) <= 1}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
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
              updateArrow({ strokeWidth: cur + 1 });
            }
          }}
          disabled={(arrow.strokeWidth ?? 3) >= 10}
          className="p-0.5 rounded text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 cursor-pointer"
          title="線を太く"
        >
          <Plus size={11} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 線の色 */}
      <MiniColorPicker
        value={arrow.color ?? '#ffffff'}
        onChange={(color) => {
          updateArrow({ color });
        }}
        title="線の色"
      />

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* ロック / ロック解除 */}
      <button
        type="button"
        onClick={() => {
          dispatchSlide(activePhaseId, activeSlideId, {
            type: 'TOGGLE_ENTITY_LOCK',
            id: arrow.id,
            kind: 'arrow',
          });
        }}
        style={
          arrow.locked
            ? { backgroundColor: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24' }
            : undefined
        }
        className={`p-1 rounded-md transition-colors cursor-pointer ${
          arrow.locked
            ? 'text-amber-400 bg-amber-500/20 hover:bg-amber-500/30'
            : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
        }`}
        title={arrow.locked ? 'ロック解除' : 'ロック (固定)'}
      >
        {arrow.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      <div className="w-px h-3.5 bg-white/[0.08] mx-0.5 shrink-0" />

      {/* 削除ボタン */}
      <button
        type="button"
        onClick={() => {
          dispatchSlide(activePhaseId, activeSlideId, {
            type: 'REMOVE_ARROW',
            id: arrow.id,
          });
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
