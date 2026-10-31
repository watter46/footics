'use client';

/**
 * transition-connector.tsx
 * Small connector between timeline slides to display and edit transition duration
 */

import type React from 'react';
import { useState } from 'react';
import type { Slide } from '@/lib/types/tactical-unified';
import { SlideTransitionPopover } from './slide-transition-popover';

export interface TransitionConnectorProps {
  targetSlide: Slide;
  targetIndex: number;
  isPlaybackActive?: boolean;
}

export function TransitionConnector({
  targetSlide,
  targetIndex,
  isPlaybackActive = false,
}: TransitionConnectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);

  const durationSec = (targetSlide.transitionDurationMs ?? 1000) / 1000;

  let cameraBadgeText: string | null = null;
  if (targetSlide.cameraTransitionMode === 'slow') {
    const camDurationSec = (targetSlide.cameraDurationMs ?? 10000) / 1000;
    cameraBadgeText = `CAM ${camDurationSec.toFixed(1)}s`;
  } else if (targetSlide.cameraTransitionMode === 'continuous') {
    cameraBadgeText = 'CAM 継続';
  } else if (targetSlide.cameraTransitionMode === 'cut') {
    cameraBadgeText = 'CAM CUT';
  }

  return (
    <>
      <button
        type="button"
        ref={setButtonRef}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={[
          'group/conn flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono transition-colors shrink-0 cursor-pointer select-none border',
          isPlaybackActive
            ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/20 text-amber-300 font-bold'
            : 'border-transparent text-white/50 hover:text-blue-300 hover:bg-white/5',
        ].join(' ')}
        title={`Scene ${targetIndex + 1} への移動時間: ${durationSec.toFixed(1)}s (クリックで編集)`}
        aria-label={`Scene ${targetIndex + 1} トランジション: ${durationSec.toFixed(1)}s`}
      >
        <span
          className={
            isPlaybackActive
              ? 'text-amber-400'
              : 'text-white/20 group-hover/conn:text-blue-400/50'
          }
        >
          ──
        </span>
        <span>{durationSec.toFixed(1)}s</span>
        <span
          className={
            isPlaybackActive
              ? 'text-amber-400'
              : 'text-white/20 group-hover/conn:text-blue-400/50'
          }
        >
          ──▶
        </span>
        {cameraBadgeText && (
          <span className="ml-0.5 px-1 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-sans">
            {cameraBadgeText}
          </span>
        )}
      </button>

      <SlideTransitionPopover
        slide={targetSlide}
        index={targetIndex}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        referenceElement={buttonRef}
      />
    </>
  );
}
