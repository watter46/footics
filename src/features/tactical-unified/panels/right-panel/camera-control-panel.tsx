'use client';

/**
 * camera-control-panel.tsx
 * Right Panel sub-panel for 3D Camera Controls in Director/Board mode
 */

import { RotateCcw } from 'lucide-react';
import type React from 'react';
import { SPLIT_CAMERA_PRESETS } from '@/features/tactical-unified/panels/split-preview/split-preview-camera-bar';
import {
  selectActivePhase,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { PitchTransform } from '@/lib/types/tactical-unified';
import { CameraPanControl } from './camera-pan-control';
import { CameraSliderField } from './camera-slider-field';
import {
  DirectorCueInspector,
  findActiveActionCue,
} from './director-cue-inspector';

export function CameraControlPanel(): React.ReactElement {
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.upsertGlobalCameraKeyframe,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );
  const deleteActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.deleteActionCameraCue,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );

  const isDirectorMode = workspaceMode === 'director';
  const currentTimeMs = playbackSeekTimeMs ?? 0;
  const directorCamera = activePhase?.directorCamera;

  const currentCamera = isDirectorMode
    ? hasActiveDirectorCameraTrack(directorCamera)
      ? resolveSyntheticDirectorCamera(directorCamera, currentTimeMs)
      : (activeSlide?.pitchTransform ?? {
          tilt: 0,
          yaw: 90,
          zoom: 1,
          panX: 0,
          panY: 0,
        })
    : (activeSlide?.pitchTransform ?? {
        tilt: 0,
        yaw: 90,
        zoom: 1,
        panX: 0,
        panY: 0,
      });

  const activeCue = isDirectorMode
    ? findActiveActionCue(directorCamera?.actionCues ?? [], currentTimeMs)
    : null;

  const tilt = Math.round(currentCamera.tilt ?? 0);
  const yaw = Math.round(currentCamera.yaw ?? 90);
  const zoom = Number(
    (
      (isDirectorMode && activeCue ? activeCue.zoom : currentCamera.zoom) ?? 1
    ).toFixed(2),
  );
  const panX = Math.round(currentCamera.panX ?? 0);
  const panY = Math.round(currentCamera.panY ?? 0);

  const syncSlide = (patch: Partial<PitchTransform>) => {
    if (activeSlideId) updatePitchTransform(activeSlideId, patch);
  };

  const handleTiltChange = (v: number) => {
    const nextTilt = Math.max(0, Math.min(65, Number.isNaN(v) ? 0 : v));
    if (isDirectorMode) {
      upsertGlobalCameraKeyframe(currentTimeMs, { tilt: nextTilt });
    }
    syncSlide({ tilt: nextTilt });
  };

  const handleYawChange = (v: number) => {
    const nextYaw = (((Number.isNaN(v) ? 90 : v) % 360) + 360) % 360;
    if (isDirectorMode) {
      upsertGlobalCameraKeyframe(currentTimeMs, { yaw: nextYaw });
    }
    syncSlide({ yaw: nextYaw });
  };

  const handlePresetSelect = (preset: { tilt: number; yaw: number }) => {
    const patch = { tilt: preset.tilt, yaw: preset.yaw };
    if (isDirectorMode) {
      upsertGlobalCameraKeyframe(currentTimeMs, patch);
    }
    syncSlide(patch);
  };

  const handleResetCamera = () => {
    if (isDirectorMode) {
      upsertGlobalCameraKeyframe(currentTimeMs, { tilt: 0, yaw: 90 });
      upsertActionCameraCue(currentTimeMs, { zoom: 1, panX: 0, panY: 0 });
    }
    syncSlide({ panX: 0, panY: 0, zoom: 1, tilt: 0, yaw: 90 });
  };

  const handleZoomChange = (v: number) => {
    const nextZoom = Math.max(0.4, Math.min(3.0, Number.isNaN(v) ? 1 : v));
    if (isDirectorMode) {
      if (activeCue) {
        upsertActionCameraCue(
          currentTimeMs,
          { zoom: nextZoom, panX, panY },
          activeCue.id,
        );
      } else {
        upsertActionCameraCue(currentTimeMs, { zoom: nextZoom, panX, panY });
      }
    }
    syncSlide({ zoom: nextZoom });
  };

  const handlePanChange = (newX: number, newY: number) => {
    const nextX = Number.isNaN(newX) ? 0 : Math.round(newX);
    const nextY = Number.isNaN(newY) ? 0 : Math.round(newY);
    if (isDirectorMode) {
      upsertActionCameraCue(currentTimeMs, {
        panX: nextX,
        panY: nextY,
        zoom,
      });
    }
    syncSlide({ panX: nextX, panY: nextY });
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

      {/* Action Cue Inspector Section (Director Mode only, when active cue exists) */}
      {isDirectorMode && activeCue && (
        <DirectorCueInspector
          cue={activeCue}
          onUpdateDuration={(cue, durationMs) =>
            upsertActionCameraCue(cue.startTimeMs, { durationMs }, cue.id)
          }
          onToggleAutoReturn={(cue) =>
            upsertActionCameraCue(
              cue.startTimeMs,
              { autoReturn: !cue.autoReturn },
              cue.id,
            )
          }
          onDeleteCue={(cueId) => deleteActionCameraCue(cueId)}
        />
      )}

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
                onClick={() => handlePresetSelect(preset)}
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

      {/* Tilt Control (0° - 65°) */}
      <CameraSliderField
        id="camera-tilt"
        label="Tilt (俯瞰角度)"
        ariaLabel="Tilt"
        value={tilt}
        min={0}
        max={65}
        unit="°"
        minLabel="0° (平面)"
        maxLabel="65° (斜め俯瞰)"
        onChange={handleTiltChange}
      />

      {/* Yaw Control (0° - 180°) */}
      <CameraSliderField
        id="camera-yaw"
        label="Yaw (水平旋回)"
        ariaLabel="Yaw"
        value={yaw}
        min={0}
        max={180}
        unit="°"
        minLabel="0° (左)"
        midLabel="90° (正面)"
        maxLabel="180° (右)"
        onChange={handleYawChange}
      />

      {/* Zoom Control (0.4x - 3.0x) */}
      <CameraSliderField
        id="camera-zoom"
        label="Zoom (ズーム)"
        ariaLabel="Zoom"
        value={zoom}
        min={0.4}
        max={3.0}
        step={0.05}
        unit="x"
        minLabel="0.4x (広域)"
        midLabel="1.0x (標準)"
        midValue={1.0}
        maxLabel="3.0x (拡大)"
        onChange={handleZoomChange}
      />

      {/* Pan Control & Display */}
      <CameraPanControl panX={panX} panY={panY} onChange={handlePanChange} />
    </div>
  );
}
