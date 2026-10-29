'use client';

/**
 * batch-transition-popover.tsx
 * Popover for updating transition settings across all scenes in a single transaction
 */

import {
  FloatingPortal,
  flip,
  offset,
  shift,
  useFloating,
} from '@floating-ui/react';
import { Clock, Pause, Sliders, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { Easing } from '@/lib/types/tactical-unified';

export interface BatchTransitionPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
}

const EASING_OPTIONS: { value: Easing; label: string }[] = [
  { value: 'ease-in-out', label: '滑らか (Ease In-Out)' },
  { value: 'linear', label: '等速 (Linear)' },
  { value: 'ease-in', label: '加速 (Ease In)' },
  { value: 'ease-out', label: '減速 (Ease Out)' },
];

export function BatchTransitionPopover({
  isOpen,
  onClose,
  referenceElement,
}: BatchTransitionPopoverProps) {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const updateAllSlideTransitions = useTacticalUnifiedStoreContext(
    (s) => s.updateAllSlideTransitions,
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    strategy: 'fixed',
    elements: {
      reference: referenceElement,
    },
    placement: 'top-end',
    middleware: [offset(8), flip(), shift({ padding: 8 })],
  });

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        !referenceElement?.contains(target)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, referenceElement]);

  if (!isOpen) return null;

  // 代表値の取得（スライド群から）
  const representativeSlide = slides[1] ?? slides[0];
  const durationSec =
    (representativeSlide?.transitionDurationMs ?? 1000) / 1000;
  const pauseSec = (slides[0]?.pauseMs ?? 500) / 1000;
  const easing = representativeSlide?.easing ?? 'ease-in-out';

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateAllSlideTransitions({
        transitionDurationMs: Math.round(val * 1000),
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateAllSlideTransitions({
        pauseMs: Math.round(val * 1000),
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAllSlideTransitions({
      easing: e.target.value as Easing,
    });
  };

  return (
    <FloatingPortal>
      <div
        ref={(node) => {
          refs.setFloating(node);
          popoverRef.current = node;
        }}
        style={floatingStyles}
        role="dialog"
        aria-label="全シーン トランジション一括設定"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="fixed z-50 w-72 bg-[#222226] border border-white/[0.08] rounded-xl p-3.5 shadow-2xl text-white text-xs select-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/[0.07]">
          <div className="flex items-center gap-1.5 font-medium text-white/90">
            <Sliders size={13} className="text-[#FF8100]" />
            <span>全シーン トランジション一括設定</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="閉じる"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          {/* 移動時間 (transitionDurationMs) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="batch-duration"
                className="flex items-center gap-1 text-[11px] text-white/70"
              >
                <Clock size={11} className="text-[#FF8100]" />
                <span>移動時間</span>
              </label>
              <span className="font-mono text-[11px] text-white/90">
                {durationSec.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="batch-duration"
                type="range"
                min="0.1"
                max="10.0"
                step="0.1"
                value={durationSec}
                onChange={handleDurationChange}
                aria-label="一括移動時間"
                className="flex-1 accent-[#FF8100] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <p className="text-[10px] text-white/40">
              ※Scene 1は到着移動を持たないため、静止時間のみ適用されます
            </p>
          </div>

          {/* 静止時間 (pauseMs) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                htmlFor="batch-pause"
                className="flex items-center gap-1 text-[11px] text-white/70"
              >
                <Pause size={11} className="text-[#FF8100]" />
                <span>静止時間</span>
              </label>
              <span className="font-mono text-[11px] text-white/90">
                {pauseSec.toFixed(1)}s
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="batch-pause"
                type="range"
                min="0.0"
                max="5.0"
                step="0.1"
                value={pauseSec}
                onChange={handlePauseChange}
                aria-label="一括静止時間"
                className="flex-1 accent-[#FF8100] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* 加減速 (Easing) */}
          <div className="space-y-1 pt-1 border-t border-white/5">
            <label
              htmlFor="batch-easing"
              className="text-[11px] text-white/70 block"
            >
              加減速 (イージング)
            </label>
            <select
              id="batch-easing"
              value={easing}
              onChange={handleEasingChange}
              aria-label="一括加減速 (イージング)"
              className="w-full bg-[#121214] border border-white/[0.08] rounded-md px-2 py-1 text-white/90 text-xs focus:outline-none focus:border-[#FF8100]"
            >
              {EASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </FloatingPortal>
  );
}
