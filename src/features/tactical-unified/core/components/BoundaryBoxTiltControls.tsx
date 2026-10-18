'use client';

import { Box } from 'lucide-react';
import React from 'react';

export interface BoundaryBoxTiltControlsProps {
  currentTilt: number;
  onTiltChange: (tilt: number) => void;
}

export const TILT_PRESETS: { angle: number; label: string }[] = [
  { angle: 0, label: '0°' },
  { angle: 15, label: '15°' },
  { angle: 30, label: '30°' },
  { angle: 45, label: '45°' },
];

export function BoundaryBoxTiltControls({
  currentTilt,
  onTiltChange,
}: BoundaryBoxTiltControlsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 text-sky-400 font-medium shrink-0">
        <Box size={13} />
        <span className="font-mono text-[11px] font-semibold text-white/90">
          {currentTilt}°
        </span>
      </div>
      <div className="flex items-center gap-0.5">
        {TILT_PRESETS.map(({ angle, label }) => (
          <button
            key={angle}
            type="button"
            onClick={() => onTiltChange(angle)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              currentTilt === angle
                ? 'bg-sky-500/30 text-sky-300 font-semibold ring-1 ring-sky-400/50'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
            title={`Set pitch tilt to ${label}`}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={45}
        step={5}
        value={currentTilt}
        onChange={(e) => onTiltChange(Number(e.target.value))}
        className="w-12 h-1 accent-sky-400 cursor-pointer bg-white/20 rounded-lg appearance-none"
        title={`Pitch tilt slider: ${currentTilt}°`}
        aria-label="Pitch tilt slider"
      />
    </div>
  );
}
