'use client';

/**
 * slide-transition-popover.tsx
 * Individual scene transition settings popover (duration, pause, easing)
 */

import { flip, offset, shift, useFloating } from '@floating-ui/react';
import { Clock, Pause, Sliders, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Easing, Slide } from '@/lib/types/tactical-unified';

export interface SlideTransitionPopoverProps {
  slide: Slide;
  index: number;
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

export function SlideTransitionPopover({
  slide,
  index,
  isOpen,
  onClose,
  referenceElement,
}: SlideTransitionPopoverProps) {
  const updateSlideTransition = useTacticalUnifiedStore(
    (s) => s.updateSlideTransition,
  );
  const popoverRef = useRef<HTMLDivElement>(null);

  const { refs, floatingStyles } = useFloating({
    elements: {
      reference: referenceElement,
    },
    placement: 'top',
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

  const durationSec = (slide.transitionDurationMs ?? 1000) / 1000;
  const pauseSec = (slide.pauseMs ?? 500) / 1000;
  const easing = slide.easing ?? 'ease-in-out';
  const isFirstScene = index === 0;

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateSlideTransition(slide.id, {
        transitionDurationMs: Math.round(val * 1000),
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateSlideTransition(slide.id, {
        pauseMs: Math.round(val * 1000),
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSlideTransition(slide.id, {
      easing: e.target.value as Easing,
    });
  };

  return (
    <div
      ref={(node) => {
        refs.setFloating(node);
        popoverRef.current = node;
      }}
      style={floatingStyles}
      role="dialog"
      aria-label="シーン トランジション設定"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 w-72 bg-[#181822] border border-white/20 rounded-xl p-3.5 shadow-2xl text-white backdrop-blur-md text-xs select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10">
        <div className="flex items-center gap-1.5 font-medium text-white/90">
          <Sliders size={13} className="text-blue-400" />
          <span>Scene {index + 1} トランジション設定</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
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
              htmlFor={`duration-${slide.id}`}
              className="flex items-center gap-1 text-[11px] text-white/70"
            >
              <Clock size={11} className="text-blue-400" />
              <span>移動時間</span>
            </label>
            <span className="font-mono text-[11px] text-white/90">
              {isFirstScene ? '0.0s (なし)' : `${durationSec.toFixed(1)}s`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id={`duration-${slide.id}`}
              type="range"
              min="0.1"
              max="10.0"
              step="0.1"
              disabled={isFirstScene}
              value={isFirstScene ? 0 : durationSec}
              onChange={handleDurationChange}
              aria-label="移動時間"
              className="flex-1 accent-blue-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
          {isFirstScene && (
            <p className="text-[10px] text-white/40">
              ※Scene 1は到着基準のため移動時間はありません
            </p>
          )}
        </div>

        {/* 静止時間 (pauseMs) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`pause-${slide.id}`}
              className="flex items-center gap-1 text-[11px] text-white/70"
            >
              <Pause size={11} className="text-emerald-400" />
              <span>静止時間</span>
            </label>
            <span className="font-mono text-[11px] text-white/90">
              {pauseSec.toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id={`pause-${slide.id}`}
              type="range"
              min="0.0"
              max="5.0"
              step="0.1"
              value={pauseSec}
              onChange={handlePauseChange}
              aria-label="静止時間"
              className="flex-1 accent-emerald-500 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* 加減速 (Easing) */}
        <div className="space-y-1 pt-1 border-t border-white/5">
          <label
            htmlFor={`easing-${slide.id}`}
            className="text-[11px] text-white/70 block"
          >
            加減速 (イージング)
          </label>
          <select
            id={`easing-${slide.id}`}
            value={easing}
            disabled={isFirstScene}
            onChange={handleEasingChange}
            aria-label="加減速 (イージング)"
            className="w-full bg-[#121218] border border-white/15 rounded-md px-2 py-1 text-white/90 text-xs focus:outline-none focus:border-blue-500 disabled:opacity-40 disabled:cursor-not-allowed"
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
  );
}
