'use client';

import { X } from 'lucide-react';
import {
  type PointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import {
  ExportPreviewControls,
  SPLIT_PREVIEW_CONTAINER_CLASSES,
  useExportPreviewAnimation,
} from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import { SplitPreviewCameraBar } from './split-preview-camera-bar';

export function TacticalSplitPreviewPanel() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const projectAspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.project.aspectRatio ?? '4:5',
  );
  const aspectRatio = activeSlide?.aspectRatio ?? projectAspectRatio;
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const setSplitPreviewOpen = useTacticalUnifiedStoreContext(
    (s) => s.setSplitPreviewOpen,
  );

  const [isPlaying, setIsPlaying] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Camera parameters for current active slide
  const tilt = activeSlide?.pitchTransform?.tilt ?? 0;
  const yaw = activeSlide?.pitchTransform?.yaw ?? 90;
  const zoom = activeSlide?.pitchTransform?.zoom ?? 1;
  const panX = activeSlide?.pitchTransform?.panX ?? 0;
  const panY = activeSlide?.pitchTransform?.panY ?? 0;

  const allPhasePlayers = useMemo(
    () => slides.flatMap((s) => s.players ?? []),
    [slides],
  );
  const playerPhotoMap = usePlayerPhotoRegistry(allPhasePlayers);

  const playerPhotos = useMemo(() => {
    const record: Record<string, CanvasImageSource> = {};
    for (const [key, img] of playerPhotoMap.entries()) {
      record[key] = img;
    }
    for (const p of allPhasePlayers) {
      const key = getPlayerPhotoKey(p);
      const img = playerPhotoMap.get(key);
      if (img) {
        record[p.id] = img;
        if (p.playerId) {
          record[String(p.playerId)] = img;
        }
      }
    }
    return record;
  }, [allPhasePlayers, playerPhotoMap]);

  const {
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
    boundaryBox: activeSlide?.boundaryBox ?? null,
    pitchTransform: isPlaying ? null : (activeSlide?.pitchTransform ?? null),
    playerPhotos,
    pitchAppearance,
    canvasRef,
    timeLabelRef,
    sliderRef,
  });

  const onTogglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    togglePlay();
  }, [togglePlay]);

  const handleSelectPreset = (preset: { tilt: number; yaw: number }) => {
    if (!activeSlide) return;
    updatePitchTransform(activeSlide.id, {
      tilt: preset.tilt,
      yaw: preset.yaw,
    });
  };

  const handleResetCamera = () => {
    if (!activeSlide) return;
    updatePitchTransform(activeSlide.id, {
      panX: 0,
      panY: 0,
      zoom: 1,
      tilt: 0,
      yaw: 90,
    });
  };

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !activeSlide) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey) {
      // Shift + 左ドラッグ: パン
      const currentPanX = activeSlide.pitchTransform?.panX ?? 0;
      const currentPanY = activeSlide.pitchTransform?.panY ?? 0;
      updatePitchTransform(activeSlide.id, {
        panX: currentPanX + dx,
        panY: currentPanY + dy,
      });
    } else {
      // 左ドラッグ（Shiftなし）: オービット（Tilt & Yaw）
      const currentTilt = activeSlide.pitchTransform?.tilt ?? 0;
      const currentYaw = activeSlide.pitchTransform?.yaw ?? 90;

      // 上ドラッグ (dy < 0) で Tilt 増加、下ドラッグ (dy > 0) で Tilt 減少
      const nextTilt = Math.max(
        0,
        Math.min(70, Math.round(currentTilt - dy * 0.25)),
      );
      // 左右ドラッグ (dx) で Yaw 旋回 (0〜360)
      const rawYaw = currentYaw + dx * 0.4;
      const nextYaw = Math.round((((rawYaw % 360) + 360) % 360) * 10) / 10;

      updatePitchTransform(activeSlide.id, {
        tilt: nextTilt,
        yaw: nextYaw,
      });
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  const handleWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    if (!activeSlide) return;
    e.preventDefault();
    const currentZoom = activeSlide.pitchTransform?.zoom ?? 1;
    const nextZoom = Math.max(
      0.5,
      Math.min(2.5, +(currentZoom - e.deltaY * 0.0015).toFixed(2)),
    );
    updatePitchTransform(activeSlide.id, { zoom: nextZoom });
  };

  return (
    <div className="flex flex-col h-full bg-[#0D0D0E] text-white select-none overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.08] bg-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-white/90">
            3D Camera Preview
          </span>
          <div className="flex items-center gap-1 font-mono text-[10px] text-white/50">
            <span ref={timeLabelRef}>0.0s</span>
            <span>/</span>
            <span>{(totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSplitPreviewOpen(false)}
          aria-label="Close 3D Split Preview"
          title="Close 3D Split Preview"
          className="p-1 rounded text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Camera Bar */}
      <SplitPreviewCameraBar
        tilt={tilt}
        yaw={yaw}
        zoom={zoom}
        panX={panX}
        panY={panY}
        onSelectPreset={handleSelectPreset}
        onResetCamera={handleResetCamera}
      />

      {/* Center 3D Preview Canvas */}
      <div className="flex-1 min-h-0 p-3 flex items-center justify-center bg-[#070709] overflow-hidden">
        <div
          style={
            previewAspectStyle ? { aspectRatio: previewAspectStyle } : undefined
          }
          className={`relative ${
            SPLIT_PREVIEW_CONTAINER_CLASSES[aspectRatio] ??
            'aspect-video w-full max-h-full'
          } rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center shadow-lg`}
        >
          <canvas
            ref={canvasRef}
            width={previewWidth}
            height={previewHeight}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="w-full h-full object-contain cursor-grab active:cursor-grabbing touch-none"
          />
        </div>
      </div>

      {/* Footer Playback Controls */}
      <div className="p-2 border-t border-white/[0.08] bg-black/40 shrink-0">
        <ExportPreviewControls
          isPlaying={isPlaying}
          onTogglePlay={onTogglePlay}
          onReset={handleReset}
          onSeek={handleSeek}
          sliderRef={sliderRef}
          totalDurationMs={totalDurationMs}
        />
      </div>
    </div>
  );
}
