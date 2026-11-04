'use client';

import {
  type PointerEvent,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from 'react';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { getPlayerPhotoKey } from '@/lib/tactical/player-photo-key';
import type { PitchTransform } from '@/lib/types/tactical/slide';
import { PreviewBoundaryOverlay } from './preview-boundary-overlay';

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
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground,
  );
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const updateActiveSlideBoundaryBox = useTacticalUnifiedStoreContext(
    (s) => s.updateActiveSlideBoundaryBox,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const isDraggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [dragPitchTransform, setDragPitchTransform] =
    useState<PitchTransform | null>(null);
  const latestPitchTransformRef = useRef<PitchTransform | null>(null);

  // 境界線の状態
  const boundaryBox = activeSlide?.boundaryBox;
  const isBoundaryActive = Boolean(boundaryBox?.enabled);

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

  const { previewWidth, previewHeight } = useExportPreviewAnimation({
    slides,
    aspectRatio,
    canvasAspectRatio: '16:9',
    boundaryBox: isPlaying && isBoundaryActive ? boundaryBox : null,
    pitchTransform: isPlaying
      ? null
      : (dragPitchTransform ?? activeSlide?.pitchTransform ?? null),
    playerPhotos,
    pitchAppearance,
    screenBackground,
    externalIsPlaying: isPlaying,
    onToggleExternalPlay: togglePlayback,
    canvasRef,
    timeLabelRef,
    sliderRef,
  });

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !activeSlide) return;
    isDraggingRef.current = true;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    const initialTransform: PitchTransform = {
      tilt: activeSlide.pitchTransform?.tilt ?? 0,
      yaw: activeSlide.pitchTransform?.yaw ?? 90,
      zoom: activeSlide.pitchTransform?.zoom ?? 1,
      panX: activeSlide.pitchTransform?.panX ?? 0,
      panY: activeSlide.pitchTransform?.panY ?? 0,
      isLocked: activeSlide.pitchTransform?.isLocked ?? false,
    };
    latestPitchTransformRef.current = initialTransform;
    setDragPitchTransform(initialTransform);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !activeSlide) return;
    const baseTransform: PitchTransform = latestPitchTransformRef.current ??
      activeSlide.pitchTransform ?? {
        tilt: 0,
        yaw: 90,
        zoom: 1,
        panX: 0,
        panY: 0,
        isLocked: false,
      };
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    if (e.shiftKey) {
      // Shift + 左ドラッグ: パン
      const currentPanX = baseTransform.panX ?? 0;
      const currentPanY = baseTransform.panY ?? 0;
      const nextTransform: PitchTransform = {
        ...baseTransform,
        panX: currentPanX + dx,
        panY: currentPanY + dy,
      };
      latestPitchTransformRef.current = nextTransform;
      setDragPitchTransform(nextTransform);
    } else {
      // 左ドラッグ（Shiftなし）: オービット（Tilt & Yaw）
      const currentTilt = baseTransform.tilt ?? 0;
      const currentYaw = baseTransform.yaw ?? 90;

      const nextTilt = Math.max(
        0,
        Math.min(70, Math.round(currentTilt - dy * 0.25)),
      );
      const rawYaw = currentYaw + dx * 0.4;
      const nextYaw = Math.round((((rawYaw % 360) + 360) % 360) * 10) / 10;

      const nextTransform: PitchTransform = {
        ...baseTransform,
        tilt: nextTilt,
        yaw: nextYaw,
      };
      latestPitchTransformRef.current = nextTransform;
      setDragPitchTransform(nextTransform);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (
      isDraggingRef.current &&
      activeSlide &&
      latestPitchTransformRef.current
    ) {
      updatePitchTransform(activeSlide.id, latestPitchTransformRef.current);
    }
    isDraggingRef.current = false;
    latestPitchTransformRef.current = null;
    setDragPitchTransform(null);
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

  const ratioNum =
    previewWidth > 0 && previewHeight > 0
      ? previewWidth / previewHeight
      : 16 / 9;

  return (
    <div className="flex flex-col h-full w-full bg-[#0D0D0E] text-white select-none overflow-hidden">
      {/* Center Layout Preview Canvas */}
      <div
        className="flex-1 min-h-0 p-4 flex items-center justify-center bg-[#070709] overflow-hidden w-full h-full"
        style={{ containerType: 'size' }}
      >
        <div
          ref={containerRef}
          data-testid="preview-container"
          className="relative rounded-lg overflow-hidden border border-white/10 bg-[#020617] flex items-center justify-center shadow-lg"
          style={{
            aspectRatio: `${previewWidth} / ${previewHeight}`,
            width: `min(100%, calc(100cqh * ${ratioNum}))`,
            maxHeight: '100%',
          }}
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
            className="w-full h-full block object-contain cursor-grab active:cursor-grabbing touch-none"
          />

          {/* 静止時 かつ 境界線有効時: 編集用ドラッグ枠 & 暗転マスク */}
          {isBoundaryActive && !isPlaying && boundaryBox && (
            <PreviewBoundaryOverlay
              boundaryBox={boundaryBox}
              containerRef={containerRef}
              onCommit={updateActiveSlideBoundaryBox}
            />
          )}
        </div>
      </div>
    </div>
  );
}
