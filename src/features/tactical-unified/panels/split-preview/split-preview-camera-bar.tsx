'use client';

import { RotateCcw } from 'lucide-react';

export const SPLIT_TILT_PRESETS = [0, 15, 25, 35] as const;

export interface SplitPreviewCameraBarProps {
  tilt: number;
  zoom: number;
  panX: number;
  panY: number;
  onChangeTilt: (tilt: number) => void;
  onResetCamera: () => void;
}

export function SplitPreviewCameraBar({
  tilt,
  zoom,
  panX,
  panY,
  onChangeTilt,
  onResetCamera,
}: SplitPreviewCameraBarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-black/40 border-b border-white/[0.08] text-xs select-none">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-medium text-white/50">Tilt:</span>
        <div className="flex items-center gap-1">
          {SPLIT_TILT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChangeTilt(preset)}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                tilt === preset
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {preset}°
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="range"
            min={0}
            max={45}
            step={1}
            value={tilt}
            onChange={(e) => onChangeTilt(Number(e.target.value))}
            aria-label="3D Tilt Angle Slider"
            className="w-16 h-1 accent-blue-500 bg-white/20 rounded cursor-pointer"
          />
          <span className="text-[10px] text-white/60 font-mono w-6">
            {tilt}°
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div
          className="px-1.5 py-0.5 rounded bg-white/5 text-[11px] font-mono text-white/70 border border-white/10"
          title={`Pan: (${Math.round(panX)}, ${Math.round(panY)})`}
        >
          {zoom.toFixed(1)}x
        </div>
        <button
          type="button"
          onClick={onResetCamera}
          aria-label="Reset 3D Camera"
          title="Reset 3D Camera"
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
