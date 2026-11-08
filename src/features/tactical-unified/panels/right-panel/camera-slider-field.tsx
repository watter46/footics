'use client';

import type React from 'react';

export interface CameraSliderFieldProps {
  id: string;
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  minLabel: string;
  maxLabel: string;
  midLabel?: string;
  onChange: (value: number) => void;
}

export function CameraSliderField({
  id,
  label,
  ariaLabel,
  value,
  min,
  max,
  step = 1,
  unit,
  minLabel,
  maxLabel,
  midLabel,
  onChange,
}: CameraSliderFieldProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/[0.06]">
      <div className="flex items-center justify-between">
        <label
          htmlFor={`${id}-number`}
          className="font-medium text-white/80 text-[11px]"
        >
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={`${id}-number`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            aria-label={ariaLabel}
            onChange={(e) => onChange(Number.parseFloat(e.target.value))}
            className="w-14 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
          />
          <span className="text-white/40 text-[11px]">{unit}</span>
        </div>
      </div>
      <input
        id={`${id}-range`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(Number.parseFloat(e.target.value))}
        className="w-full accent-[#FF8100] cursor-pointer"
      />
      <div className="flex justify-between text-[10px] text-white/40 font-mono">
        <span>{minLabel}</span>
        {midLabel && <span>{midLabel}</span>}
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}
