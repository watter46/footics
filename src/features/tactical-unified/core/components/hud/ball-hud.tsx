'use client';

import type React from 'react';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function BallHud(): React.ReactElement | null {
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const setBallSizeScale = useTacticalUnifiedStoreContext(
    (s) => s.setBallSizeScale,
  );

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
          if (!Number.isNaN(next)) {
            setBallSizeScale(activeSlideId, next);
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
