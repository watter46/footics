'use client';

/**
 * export-preview-player.tsx
 * High-performance real-time canvas animation preview player for Export Modal.
 *
 * Features:
 *   - 60fps real-time interpolation preview (Players, Ball, Zones, Arrows, Texts)
 *   - Boundary Box Crop aware preview
 *   - Play / Pause, Timeline Seek bar, Loop toggle, Time display
 */

import { useRef } from 'react';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
import {
  ExportPreviewControls,
  type ExportPreviewControlsProps,
} from './export-preview-controls';
import {
  ASPECT_CONTAINER_CLASSES,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  type UseExportPreviewAnimationParams,
  useAnimationFrameLoop,
  useExportPreviewAnimation,
} from './use-export-preview-animation';

export {
  ASPECT_CONTAINER_CLASSES,
  ExportPreviewControls,
  type ExportPreviewControlsProps,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  type UseExportPreviewAnimationParams,
  useAnimationFrameLoop,
  useExportPreviewAnimation,
};

export interface ExportPreviewPlayerProps {
  slides: Slide[];
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBox | null;
  pitchTransform?: PitchTransform | null;
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}

export function ExportPreviewPlayer({
  slides,
  aspectRatio,
  boundaryBox,
  pitchTransform,
  photos,
  playerPhotos,
  pitchAppearance,
}: ExportPreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const {
    isPlaying,
    totalDurationMs,
    previewWidth,
    previewHeight,
    previewAspectStyle,
    togglePlay,
    handleReset,
    handleSeek,
  } = useExportPreviewAnimation({
    slides,
    aspectRatio,
    boundaryBox,
    pitchTransform,
    photos,
    playerPhotos,
    pitchAppearance,
    canvasRef,
    timeLabelRef,
    sliderRef,
  });

  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-black/50 border border-white/10 p-3 overflow-hidden">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold text-white/90">Animation Preview</span>
        <div className="flex items-center gap-1 font-mono text-[11px] text-white/50">
          <span ref={timeLabelRef}>0.0s</span>
          <span>/</span>
          <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        style={
          previewAspectStyle ? { aspectRatio: previewAspectStyle } : undefined
        }
        className={`relative w-full ${
          ASPECT_CONTAINER_CLASSES[aspectRatio] ?? 'aspect-video'
        } rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center`}
      >
        <canvas
          ref={canvasRef}
          width={previewWidth}
          height={previewHeight}
          className="w-full h-full object-contain"
        />

        {/* Boundary Crop Watermark/Badge */}
        {isBoundaryActive && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 border border-green-500/40 text-green-400 text-[10px] font-medium backdrop-blur-sm">
            Boundary Cropped
          </div>
        )}
      </div>

      <ExportPreviewControls
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onReset={handleReset}
        onSeek={handleSeek}
        sliderRef={sliderRef}
        totalDurationMs={totalDurationMs}
      />
    </div>
  );
}
