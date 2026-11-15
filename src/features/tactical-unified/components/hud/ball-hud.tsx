'use client';

import type React from 'react';
import { registerHudContentRenderer } from '@/features/tactical-unified/core';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export function BallHud(): React.ReactElement | null {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);

  const scale = activeSlide?.ball?.sizeScale ?? 1.0;

  return (
    <div className="flex items-center gap-1.5 px-1">
      <span className="text-[11px] text-white/70 select-none">サイズ</span>
      <input
        type="range"
        min="0.5"
        max="2.0"
        step="0.1"
        value={scale}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (!Number.isNaN(next) && activePhaseId && activeSlideId) {
            dispatchSlide(activePhaseId, activeSlideId, {
              type: 'UPDATE_BALL',
              patch: { sizeScale: next },
            });
          }
        }}
        aria-label="ボールサイズ"
        className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <span className="text-[11px] font-mono text-white/90 min-w-[28px] text-right">
        {scale.toFixed(1)}x
      </span>
    </div>
  );
}

registerHudContentRenderer('ball', () => <BallHud />);
