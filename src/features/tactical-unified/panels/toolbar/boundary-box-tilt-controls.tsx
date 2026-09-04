'use client';

import { Box } from 'lucide-react';
import React, { useCallback } from 'react';
import type { PitchTransform } from '@/lib/types/tactical-unified';

export interface BoundaryBoxTiltControlsProps {
  activeSlideId: string;
  tilt: number;
  updatePitchTransform: (
    slideId: string,
    patch: Partial<PitchTransform>,
  ) => void;
}

export const TILT_PRESETS: { angle: number; label: string }[] = [
  { angle: 0, label: '0°' },
  { angle: 15, label: '15°' },
  { angle: 30, label: '30°' },
  { angle: 45, label: '45°' },
];

export const BoundaryBoxTiltControls = React.memo(
  function BoundaryBoxTiltControls({
    activeSlideId,
    tilt,
    updatePitchTransform,
  }: BoundaryBoxTiltControlsProps) {
    const handleSetTilt = useCallback(
      (angle: number) => {
        updatePitchTransform(activeSlideId, { tilt: angle });
      },
      [activeSlideId, updatePitchTransform],
    );

    const handleSliderChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        updatePitchTransform(activeSlideId, { tilt: value });
      },
      [activeSlideId, updatePitchTransform],
    );

    return (
      <div
        role="group"
        className="flex items-center gap-1.5"
        aria-label="Pitch Tilt Controls"
      >
        <div
          className="flex items-center gap-1 text-sky-400 font-medium shrink-0"
          title="Pitch 2.5D Tilt Angle"
        >
          <Box size={13} />
          <span className="font-mono text-[11px] font-semibold text-white/90">
            {tilt}°
          </span>
        </div>

        {/* Quick Tilt Snap Buttons */}
        <div className="flex items-center gap-0.5">
          {TILT_PRESETS.map(({ angle, label }) => {
            const isActive = tilt === angle;
            return (
              <button
                key={angle}
                type="button"
                onClick={() => handleSetTilt(angle)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-sky-500/30 text-sky-300 font-semibold ring-1 ring-sky-400/50'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
                title={`Set pitch tilt to ${label}`}
                aria-label={`Set pitch tilt to ${label}`}
                aria-pressed={isActive}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Tilt Adjustment Slider */}
        <input
          type="range"
          min={0}
          max={45}
          step={5}
          value={tilt}
          onChange={handleSliderChange}
          className="w-12 h-1 accent-sky-400 cursor-pointer bg-white/20 rounded-lg appearance-none"
          title={`Pitch tilt slider: ${tilt}°`}
          aria-label="Pitch tilt slider"
        />
      </div>
    );
  },
);
