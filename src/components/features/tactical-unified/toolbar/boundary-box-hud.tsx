'use client';

/**
 * boundary-box-hud.tsx
 * Floating HUD overlay for the export boundary box.
 *
 * Features:
 *  - Displays current aspect ratio (16:9, 9:16, 4:5, 1:1, or custom ratio)
 *  - Quick ratio snap buttons: 16:9, 9:16, 4:5, 1:1
 *  - Fit button (snaps boundary box to full canvas 100% × 100%)
 *  - Positioned dynamically above the active boundary box
 */

import { Crop, Maximize2 } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
  type XMediaRatio,
} from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/stores/tactical-unified-store';

export interface BoundaryBoxHudProps {
  stageSize: { width: number; height: number };
}

const PRESET_RATIOS: { ratio: XMediaRatio; label: string }[] = [
  { ratio: '16:9', label: '16:9' },
  { ratio: '9:16', label: '9:16' },
  { ratio: '4:5', label: '4:5' },
  { ratio: '1:1', label: '1:1' },
];

export const BoundaryBoxHud = React.memo(function BoundaryBoxHud({
  stageSize,
}: BoundaryBoxHudProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const canvasAspect = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);

  const box = activeSlide?.boundaryBox;

  // Calculate current ratio and label
  const { ratioLabel, matchedRatio } = useMemo(() => {
    if (!box?.enabled || box.height === 0) {
      return { ratioLabel: '', matchedRatio: null };
    }
    const stageAspect = ASPECT_RATIOS[canvasAspect] ?? 16 / 9;
    const currentAspect = (box.width / box.height) * stageAspect;

    for (const p of PRESET_RATIOS) {
      const target = ASPECT_RATIOS[p.ratio as AspectRatio] ?? 1;
      if (Math.abs(currentAspect - target) < 0.05) {
        return { ratioLabel: p.label, matchedRatio: p.ratio };
      }
    }
    return {
      ratioLabel: `${currentAspect.toFixed(2)}:1`,
      matchedRatio: null,
    };
  }, [box, canvasAspect]);

  if (isExporting || !box?.enabled || stageSize.width === 0) {
    return null;
  }

  // Pixel coordinates relative to stage container
  const pxX = (box.x / 100) * stageSize.width;
  const pxY = (box.y / 100) * stageSize.height;
  const pxW = (box.width / 100) * stageSize.width;

  // Position HUD centered above the top edge of the box (or inside if near top edge)
  const top = pxY > 36 ? pxY - 34 : pxY + 8;
  const left = Math.max(120, Math.min(stageSize.width - 120, pxX + pxW / 2));

  const handleApplyRatio = (ratio: XMediaRatio) => {
    const newBox = createXBoundaryBox(ratio, canvasAspect);
    setBoundaryBox(activeSlideId, newBox);
  };

  const handleFullFit = () => {
    setBoundaryBox(activeSlideId, { ...DEFAULT_BOUNDARY_BOX_FULL });
  };

  return (
    <aside
      aria-label="Boundary Box Ratio HUD"
      className="absolute z-40 pointer-events-auto flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-900/90 backdrop-blur-md border border-white/20 shadow-xl select-none -translate-x-1/2 transition-[top,left] duration-75 text-xs text-white"
      style={{
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
      }}
    >
      <div className="flex items-center gap-1 text-sky-400 font-medium shrink-0">
        <Crop size={13} />
        <span className="font-mono text-[11px] font-semibold text-white/90">
          {ratioLabel}
        </span>
      </div>

      <div className="w-px h-3.5 bg-white/20" />

      {/* Quick Ratio Snap Buttons */}
      <div className="flex items-center gap-0.5">
        {PRESET_RATIOS.map(({ ratio, label }) => {
          const isActive = matchedRatio === ratio;
          return (
            <button
              key={ratio}
              type="button"
              onClick={() => handleApplyRatio(ratio)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                isActive
                  ? 'bg-sky-500/30 text-sky-300 font-semibold ring-1 ring-sky-400/50'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
              title={`Snap boundary box to ${label}`}
              aria-label={`Snap boundary to ${label}`}
              aria-pressed={isActive}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="w-px h-3.5 bg-white/20" />

      {/* Full Fit Button */}
      <button
        type="button"
        onClick={handleFullFit}
        className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        title="全画面フィット (100% × 100%)"
        aria-label="Full fit boundary box"
      >
        <Maximize2 size={12} />
      </button>
    </aside>
  );
});
