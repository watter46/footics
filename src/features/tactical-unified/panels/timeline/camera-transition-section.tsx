'use client';

/**
 * camera-transition-section.tsx
 * Reusable section for camera transition settings (mode & duration slider)
 */

import { Video } from 'lucide-react';
import type React from 'react';
import type { CameraTransitionMode } from '@/lib/types/tactical-unified';

export interface CameraTransitionSectionProps {
  idPrefix: string;
  mode: CameraTransitionMode;
  durationMs: number;
  disabled?: boolean;
  isBatch?: boolean;
  onChangeMode: (mode: CameraTransitionMode) => void;
  onChangeDurationMs: (durationMs: number) => void;
}

const CAMERA_MODE_OPTIONS: { value: CameraTransitionMode; label: string }[] = [
  { value: 'sync', label: '連動' },
  { value: 'slow', label: 'スロー' },
  { value: 'continuous', label: '継続' },
  { value: 'cut', label: 'Cut' },
];

export function CameraTransitionSection({
  idPrefix,
  mode,
  durationMs,
  disabled = false,
  isBatch = false,
  onChangeMode,
  onChangeDurationMs,
}: CameraTransitionSectionProps): React.JSX.Element {
  const durationSec = durationMs / 1000;
  const sliderLabel = isBatch ? '一括カメラ秒数' : 'カメラ秒数';

  return (
    <div className="space-y-2 pt-2 border-t border-white/5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-white/70">
          <Video size={11} className="text-[#FF8100]" />
          <span>カメラ移動</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 p-0.5 bg-[#121214] border border-white/[0.08] rounded-md">
        {CAMERA_MODE_OPTIONS.map((opt) => {
          const isSelected = mode === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChangeMode(opt.value)}
              className={[
                'py-1 text-[11px] rounded transition-colors text-center font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-40',
                isSelected
                  ? 'bg-[#FF8100] text-black font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/5',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {mode === 'slow' && (
        <div className="space-y-1 pt-1 border-t border-white/5">
          <div className="flex items-center justify-between">
            <label
              htmlFor={`${idPrefix}-camera-duration`}
              className="flex items-center gap-1 text-[11px] text-white/70"
            >
              <span>{sliderLabel}</span>
            </label>
            <span className="font-mono text-[11px] text-white/90">
              {durationSec.toFixed(1)}s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              id={`${idPrefix}-camera-duration`}
              type="range"
              min="0.5"
              max="30.0"
              step="0.5"
              disabled={disabled}
              value={durationSec}
              onChange={(e) => {
                const val = Number.parseFloat(e.target.value);
                if (!Number.isNaN(val)) {
                  onChangeDurationMs(Math.round(val * 1000));
                }
              }}
              aria-label={sliderLabel}
              className="flex-1 accent-[#FF8100] h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      )}
    </div>
  );
}
