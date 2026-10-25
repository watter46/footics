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
}

export function TransitionConnector({
  targetSlide,
  targetIndex,
}: TransitionConnectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null);

  const durationSec = (targetSlide.transitionDurationMs ?? 1000) / 1000;

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
        className="group/conn flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] font-mono text-white/50 hover:text-blue-300 hover:bg-white/5 transition-colors shrink-0 cursor-pointer select-none"
        title={`Scene ${targetIndex + 1} への移動時間: ${durationSec.toFixed(1)}s (クリックで編集)`}
        aria-label={`Scene ${targetIndex + 1} トランジション: ${durationSec.toFixed(1)}s`}
      >
        <span className="text-white/20 group-hover/conn:text-blue-400/50">
          ──
        </span>
        <span>{durationSec.toFixed(1)}s</span>
        <span className="text-white/20 group-hover/conn:text-blue-400/50">
          ──▶
        </span>
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
