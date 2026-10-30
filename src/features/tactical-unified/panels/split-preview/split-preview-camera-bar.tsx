'use client';

import { RotateCcw } from 'lucide-react';

export interface CameraPreset {
  id: string;
  label: string;
  tilt: number;
  yaw: number;
}

export const SPLIT_CAMERA_PRESETS: readonly CameraPreset[] = [
  {
    id: 'top-down',
    label: 'トップダウン（完全平面・縦向き）',
    tilt: 0,
    yaw: 90,
  },
  { id: 'shallow-front', label: '浅い俯瞰（正面）', tilt: 15, yaw: 90 },
  { id: 'shallow-right', label: '浅い斜め（右向き）', tilt: 15, yaw: 75 },
  { id: 'shallow-left', label: '浅い斜め（左向き）', tilt: 15, yaw: 105 },
  {
    id: 'dynamic-right',
    label: 'ダイナミック斜め（右向き）',
    tilt: 50,
    yaw: 80,
  },
  {
    id: 'dynamic-left',
    label: 'ダイナミック斜め（左向き）',
    tilt: 50,
    yaw: 100,
  },
] as const;

export interface SplitPreviewCameraBarProps {
  tilt: number;
  yaw: number;
  zoom: number;
  panX: number;
  panY: number;
  onSelectPreset: (preset: { tilt: number; yaw: number }) => void;
  onResetCamera: () => void;
}

function PresetPitchIcon({ id }: { id: string }) {
  switch (id) {
    case 'top-down':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <rect x="3" y="1" width="10" height="14" rx="0.5" />
          <line x1="3" y1="8" x2="13" y2="8" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      );
    case 'shallow-front':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <polygon points="4,3 12,3 14,14 2,14" />
          <line x1="3" y1="8.5" x2="13" y2="8.5" />
        </svg>
      );
    case 'shallow-right':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <polygon points="5,3 13,4 12,14 2,13" />
          <line x1="3.5" y1="8.5" x2="12.5" y2="9" />
        </svg>
      );
    case 'shallow-left':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <polygon points="3,4 11,3 14,13 4,14" />
          <line x1="3.5" y1="9" x2="12.5" y2="8.5" />
        </svg>
      );
    case 'dynamic-right':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <polygon points="7,4 14,6 11,14 1,12" />
          <line x1="4" y1="8" x2="12.5" y2="10" />
        </svg>
      );
    case 'dynamic-left':
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <polygon points="2,6 9,4 15,12 5,14" />
          <line x1="3.5" y1="10" x2="12.5" y2="8" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          className="w-3.5 h-3.5 shrink-0"
          aria-hidden="true"
        >
          <rect x="3" y="1" width="10" height="14" rx="0.5" />
        </svg>
      );
  }
}

export function SplitPreviewCameraBar({
  tilt,
  yaw,
  zoom,
  panX,
  panY,
  onSelectPreset,
  onResetCamera,
}: SplitPreviewCameraBarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-black/40 border-b border-white/[0.08] text-xs select-none">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-medium text-white/50">Camera:</span>
        <div className="flex items-center gap-1 flex-wrap">
          {SPLIT_CAMERA_PRESETS.map((preset) => {
            const isActive = tilt === preset.tilt && yaw === preset.yaw;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onSelectPreset({ tilt: preset.tilt, yaw: preset.yaw })
                }
                title={preset.label}
                aria-label={`${preset.label} (${preset.tilt}°/${preset.yaw}°)`}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <PresetPitchIcon id={preset.id} />
                <span>
                  {preset.tilt}°/{preset.yaw}°
                </span>
              </button>
            );
          })}
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
