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

import { Crop, Expand, Maximize2 } from 'lucide-react';
import React, { useMemo } from 'react';
import {
  selectActiveSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
  type XMediaRatio,
} from '@/lib/types/tactical-unified';
import { BoundaryBoxTiltControls } from './boundary-box-tilt-controls';

export interface BoundaryBoxHudProps {
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
}

const PRESET_RATIOS: { ratio: XMediaRatio; label: string }[] = [
  { ratio: '16:9', label: '16:9' },
  { ratio: '9:16', label: '9:16' },
  { ratio: '4:5', label: '4:5' },
  { ratio: '1:1', label: '1:1' },
];

export const BoundaryBoxHud = React.memo(function BoundaryBoxHud({
  stageSize,
  pitchRect: _pitchRect,
}: BoundaryBoxHudProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const canvasAspect = useTacticalUnifiedStore((s) => s.project.aspectRatio);
  const isExporting = useTacticalUnifiedStore((s) => s.isExporting);
  const setBoundaryBox = useTacticalUnifiedStore((s) => s.setBoundaryBox);
  const updatePitchTransform = useTacticalUnifiedStore(
    (s) => s.updatePitchTransform,
  );
  const autoFitBoundaryBox = useTacticalUnifiedStore(
    (s) => s.autoFitBoundaryBox,
  );

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

  const handleApplyRatio = (ratio: XMediaRatio) => {
    const newBox = createXBoundaryBox(ratio, canvasAspect);
    setBoundaryBox(activeSlideId, newBox);
  };

  const handlePitchFit = () => {
    autoFitBoundaryBox(activeSlideId);
  };

  const handleCanvasFit = () => {
    setBoundaryBox(activeSlideId, { ...DEFAULT_BOUNDARY_BOX_FULL });
  };

  return (
    <aside
      aria-label="Boundary Box Ratio HUD"
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900/90 backdrop-blur-md border border-white/20 shadow-xl select-none text-xs text-white"
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

      {/* AutoFitPitch & AutoFitCanvas Action Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handlePitchFit}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="AutoFitPitch (ピッチ外枠にフィット)"
          aria-label="AutoFitPitch"
        >
          <Maximize2 size={12} />
        </button>
        <button
          type="button"
          onClick={handleCanvasFit}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="AutoFitCanvas (全画面フィット 100% × 100%)"
          aria-label="AutoFitCanvas"
        >
          <Expand size={12} />
        </button>
      </div>

      <div className="w-px h-3.5 bg-white/20" />

      {/* 2.5D Tilt Controls */}
      <BoundaryBoxTiltControls
        activeSlideId={activeSlideId}
        tilt={activeSlide?.pitchTransform?.tilt ?? 0}
        updatePitchTransform={updatePitchTransform}
      />
    </aside>
  );
});
