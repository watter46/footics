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

import { useEffect, useRef } from 'react';
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
  CINEMATIC_MASK_FILL,
  hasActivePitchTransform,
  PREVIEW_DIMENSIONS,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  type UseExportPreviewAnimationParams,
  useAnimationFrameLoop,
  useExportPreviewAnimation,
} from './use-export-preview-animation';

export {
  ASPECT_CONTAINER_CLASSES,
  CINEMATIC_MASK_FILL,
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
  bottomBarSlot?: React.ReactNode;
}

export function ExportPreviewPlayer({
  slides,
  aspectRatio,
  boundaryBox,
  pitchTransform,
  photos,
  playerPhotos,
  pitchAppearance,
  bottomBarSlot,
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [togglePlay]);

  const isBoundaryActive =
    boundaryBox?.enabled &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0 &&
    (boundaryBox.width < 100 ||
      boundaryBox.height < 100 ||
      boundaryBox.x > 0 ||
      boundaryBox.y > 0);

  const ratioNum =
    previewWidth > 0 && previewHeight > 0
      ? previewWidth / previewHeight
      : 16 / 9;

  const resolvedAspectRatio =
    previewAspectStyle ??
    (aspectRatio === '9:16'
      ? '9 / 16'
      : aspectRatio === '1:1'
        ? '1 / 1'
        : aspectRatio === '4:5'
          ? '4 / 5'
          : '16 / 9');

  return (
    <div className="flex-1 min-h-0 w-full flex flex-col rounded-xl bg-black/40 border border-white/10 overflow-hidden">
      {/* Upper Viewport: 境界線アスペクト比連動 最大フィット */}
      <div
        className="relative flex-1 min-h-0 w-full p-4 flex items-center justify-center bg-[#020617]/40 overflow-hidden"
        style={{ containerType: 'size' }}
      >
        <div
          data-testid="export-preview-viewport"
          style={{
            aspectRatio: resolvedAspectRatio,
            width: `min(100%, calc(100cqh * ${ratioNum}))`,
            maxHeight: '100%',
          }}
          className="relative rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center shadow-2xl"
        >
          <canvas
            ref={canvasRef}
            width={previewWidth}
            height={previewHeight}
            className="w-full h-full block"
          />

          {/* Boundary Crop Watermark/Badge */}
          {isBoundaryActive && (
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded bg-black/80 border border-green-500/50 text-green-400 text-[10px] font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-md select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span>Boundary Cropped</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Compact 1-Row Bar */}
      <div className="shrink-0 w-full px-4 py-2.5 bg-neutral-950/90 border-t border-white/10 backdrop-blur-md flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
        {/* Playback & Seek */}
        <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-xl">
          <ExportPreviewControls
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onReset={handleReset}
            onSeek={handleSeek}
            sliderRef={sliderRef}
            totalDurationMs={totalDurationMs}
          />
          <div className="flex items-center gap-1 font-mono text-[11px] text-white/50 shrink-0 select-none">
            <span ref={timeLabelRef}>0.0s</span>
            <span>/</span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>

        {/* Settings & Actions Slot */}
        {bottomBarSlot && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {bottomBarSlot}
          </div>
        )}
      </div>
    </div>
  );
}
