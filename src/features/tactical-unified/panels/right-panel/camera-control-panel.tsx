'use client';

/**
 * camera-control-panel.tsx
 * Right Panel sub-panel for 3D Camera Controls in Director/Layout mode
 */

import { RotateCcw } from 'lucide-react';
import { SPLIT_CAMERA_PRESETS } from '@/features/tactical-unified/panels/split-preview/split-preview-camera-bar';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function CameraControlPanel(): React.ReactElement {
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );

  const tilt = activeSlide?.pitchTransform?.tilt ?? 0;
  const yaw = activeSlide?.pitchTransform?.yaw ?? 90;
  const zoom = activeSlide?.pitchTransform?.zoom ?? 1;
  const panX = Math.round(activeSlide?.pitchTransform?.panX ?? 0);
  const panY = Math.round(activeSlide?.pitchTransform?.panY ?? 0);

  const handleTiltChange = (value: number) => {
    if (!activeSlideId) return;
    const clamped = Math.max(0, Math.min(60, Number.isNaN(value) ? 0 : value));
    updatePitchTransform(activeSlideId, { tilt: clamped });
  };

  const handleYawChange = (value: number) => {
    if (!activeSlideId) return;
    const clamped = Math.max(
      0,
      Math.min(180, Number.isNaN(value) ? 90 : value),
    );
    updatePitchTransform(activeSlideId, { yaw: clamped });
  };

  const handleResetCamera = () => {
    if (!activeSlideId) return;
    updatePitchTransform(activeSlideId, {
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      yaw: 90,
    });
  };

  return (
    <div className="h-full overflow-y-auto p-4 flex flex-col gap-5 text-xs text-white/90 select-none">
      {/* Header with Title and Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
        <div>
          <h3 className="text-sm font-semibold text-white">Camera Controls</h3>
          <p className="text-[11px] text-white/50 mt-0.5">
            Adjust 3D pitch view and perspective
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetCamera}
          aria-label="Reset Camera"
          title="Reset Camera"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer text-[11px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Camera Presets Section */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-medium text-white/60 uppercase tracking-wider">
          Camera Presets
        </span>
        <div className="grid grid-cols-2 gap-1.5">
          {SPLIT_CAMERA_PRESETS.map((preset) => {
            const isActive = tilt === preset.tilt && yaw === preset.yaw;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  if (!activeSlideId) return;
                  updatePitchTransform(activeSlideId, {
                    tilt: preset.tilt,
                    yaw: preset.yaw,
                  });
                }}
                title={preset.label}
                aria-label={preset.label}
                className={`flex flex-col items-start px-2.5 py-1.5 rounded text-left transition-colors border ${
                  isActive
                    ? 'bg-[#FF8100]/24 text-[#FFA336] border-[#FF8100]/80 ring-1 ring-[#FF8100]/40 shadow-[0_0_12px_rgba(255,129,0,0.3)]'
                    : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border-white/5'
                }`}
              >
                <span className="font-medium truncate w-full text-[11px]">
                  {preset.label}
                </span>
                <span className="text-[10px] text-white/40 mt-0.5 font-mono">
                  {preset.tilt}° / {preset.yaw}°
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tilt Control (0° - 60°) */}
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/[0.06]">
        <div className="flex items-center justify-between">
          <label
            htmlFor="camera-tilt-number"
            className="font-medium text-white/80 text-[11px]"
          >
            Tilt (俯瞰角度)
          </label>
          <div className="flex items-center gap-1">
            <input
              id="camera-tilt-number"
              type="number"
              min={0}
              max={60}
              value={tilt}
              aria-label="Tilt"
              onChange={(e) =>
                handleTiltChange(Number.parseInt(e.target.value, 10))
              }
              className="w-14 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
            />
            <span className="text-white/40 text-[11px]">°</span>
          </div>
        </div>
        <input
          id="camera-tilt-range"
          type="range"
          min={0}
          max={60}
          value={tilt}
          aria-label="Tilt"
          onChange={(e) =>
            handleTiltChange(Number.parseInt(e.target.value, 10))
          }
          className="w-full accent-[#FF8100] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-white/40 font-mono">
          <span>0° (平面)</span>
          <span>60° (斜め俯瞰)</span>
        </div>
      </div>

      {/* Yaw Control (0° - 180°) */}
      <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-black/20 border border-white/[0.06]">
        <div className="flex items-center justify-between">
          <label
            htmlFor="camera-yaw-number"
            className="font-medium text-white/80 text-[11px]"
          >
            Yaw (水平旋回)
          </label>
          <div className="flex items-center gap-1">
            <input
              id="camera-yaw-number"
              type="number"
              min={0}
              max={180}
              value={yaw}
              aria-label="Yaw"
              onChange={(e) =>
                handleYawChange(Number.parseInt(e.target.value, 10))
              }
              className="w-14 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
            />
            <span className="text-white/40 text-[11px]">°</span>
          </div>
        </div>
        <input
          id="camera-yaw-range"
          type="range"
          min={0}
          max={180}
          value={yaw}
          aria-label="Yaw"
          onChange={(e) => handleYawChange(Number.parseInt(e.target.value, 10))}
          className="w-full accent-[#FF8100] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-white/40 font-mono">
          <span>0° (左)</span>
          <span>90° (正面)</span>
          <span>180° (右)</span>
        </div>
      </div>

      {/* Zoom and Pan Status Display */}
      <div className="p-3 rounded-lg bg-black/20 border border-white/[0.06] flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-white/80">
            Zoom & Pan
          </span>
          <span className="text-[10px] text-white/40">
            Preview canvas drag / wheel values
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/80">
            {zoom.toFixed(1)}x
          </span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/60">
            ({panX}, {panY})
          </span>
        </div>
      </div>
    </div>
  );
}
