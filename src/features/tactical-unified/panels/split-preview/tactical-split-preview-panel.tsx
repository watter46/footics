'use client';

import { type PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  selectActivePhase,
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { PitchTransform } from '@/lib/types/tactical/slide';
import { PreviewBoundaryOverlay } from './preview-boundary-overlay';
import { buildPlayerPhotoRecord } from './preview-player-photos';
import { usePreviewWheelZoom } from './use-preview-wheel-zoom';

export function TacticalSplitPreviewPanel() {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const aspectRatio = useTacticalUnifiedStoreContext(
    selectActivePhaseAspectRatio,
  );
  const phaseBoundaryBox = useTacticalUnifiedStoreContext(
    selectActivePhaseBoundaryBox,
  );
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance,
  );
  const screenBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.screenBackground,
  );
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const togglePlayback = useTacticalUnifiedStoreContext(
    (s) => s.togglePlayback,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const updateActiveSlideBoundaryBox = useTacticalUnifiedStoreContext(
    (s) => s.updateActiveSlideBoundaryBox,
  );
  const upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.upsertGlobalCameraKeyframe,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeLabelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  const isDraggingRef = useRef(false);
  const dragModeRef = useRef<'orbit' | 'pan' | null>(null);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const [dragPitchTransform, setDragPitchTransform] =
    useState<PitchTransform | null>(null);
  const latestPitchTransformRef = useRef<PitchTransform | null>(null);

  const currentTimeMs = playbackSeekTimeMs ?? 0;
  const isDirectorCameraActive = hasActiveDirectorCameraTrack(
    activePhase?.directorCamera,
  );
  const resolvedCamera: PitchTransform | null = isDirectorCameraActive
    ? resolveSyntheticDirectorCamera(
        activePhase!.directorCamera!,
        currentTimeMs,
        { isEditing: !isPlaying },
      )
    : (activeSlide?.pitchTransform ?? null);
  const activeCue = activePhase?.directorCamera?.actionCues?.find(
    (c) =>
      currentTimeMs >= c.startTimeMs &&
      currentTimeMs <= c.startTimeMs + (c.durationMs ?? 1000),
  );

  // 境界線の状態
  const boundaryBox = activeSlide?.boundaryBox ?? phaseBoundaryBox;
  const isBoundaryActive = Boolean(boundaryBox?.enabled);

  const allPhasePlayers = useMemo(
    () => slides.flatMap((s) => s.players ?? []),
    [slides],
  );
  const playerPhotoMap = usePlayerPhotoRegistry(allPhasePlayers);
  const playerPhotos = useMemo(
    () => buildPlayerPhotoRecord(allPhasePlayers, playerPhotoMap),
    [allPhasePlayers, playerPhotoMap],
  );

  const { previewWidth, previewHeight } = useExportPreviewAnimation({
    slides,
    aspectRatio,
    canvasAspectRatio: '16:9',
    boundaryBox: isPlaying && isBoundaryActive ? boundaryBox : null,
    pitchTransform: isPlaying
      ? null
      : (dragPitchTransform ??
        (isDirectorCameraActive
          ? null
          : (activeSlide?.pitchTransform ?? null))),
    directorCamera: activePhase?.directorCamera ?? null,
    directorCameraOptions: { isEditing: !isPlaying },
    playerPhotos,
    pitchAppearance,
    screenBackground,
    teamVisibility,
    externalIsPlaying: isPlaying,
    onToggleExternalPlay: togglePlayback,
    canvasRef,
    timeLabelRef,
    sliderRef,
  });

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !activeSlide) return;
    isDraggingRef.current = true;
    dragModeRef.current = e.shiftKey ? 'pan' : 'orbit';
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    const baseCamera = resolvedCamera ?? activeSlide.pitchTransform;
    const initialTransform: PitchTransform = {
      tilt: baseCamera?.tilt ?? 0,
      yaw: baseCamera?.yaw ?? 90,
      zoom: baseCamera?.zoom ?? 1,
      panX: baseCamera?.panX ?? 0,
      panY: baseCamera?.panY ?? 0,
      isLocked: baseCamera?.isLocked ?? false,
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
    const baseCamera = resolvedCamera ?? activeSlide.pitchTransform;
    const base: PitchTransform = latestPitchTransformRef.current ??
      baseCamera ?? {
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

    const nextTransform: PitchTransform = e.shiftKey
      ? { ...base, panX: (base.panX ?? 0) + dx, panY: (base.panY ?? 0) + dy }
      : {
          ...base,
          tilt: Math.max(
            0,
            Math.min(70, Math.round((base.tilt ?? 0) - dy * 0.25)),
          ),
          yaw:
            Math.round(
              (((((base.yaw ?? 90) + dx * 0.4) % 360) + 360) % 360) * 10,
            ) / 10,
        };
    dragModeRef.current = e.shiftKey ? 'pan' : 'orbit';
    latestPitchTransformRef.current = nextTransform;
    setDragPitchTransform(nextTransform);
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (
      isDraggingRef.current &&
      activeSlide &&
      latestPitchTransformRef.current
    ) {
      const latest = latestPitchTransformRef.current;
      if (dragModeRef.current === 'pan') {
        upsertActionCameraCue(currentTimeMs, {
          panX: latest.panX,
          panY: latest.panY,
          zoom: latest.zoom,
        });
        updatePitchTransform(activeSlide.id, latest);
      } else {
        upsertGlobalCameraKeyframe(currentTimeMs, {
          tilt: latest.tilt,
          yaw: latest.yaw,
        });
        updatePitchTransform(activeSlide.id, latest);
      }
    }
    isDraggingRef.current = false;
    dragModeRef.current = null;
    latestPitchTransformRef.current = null;
    setDragPitchTransform(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // JSDOM fallback
    }
  };

  usePreviewWheelZoom({
    containerRef,
    activeCue,
    resolvedCamera,
    activeSlide,
    currentTimeMs,
    upsertActionCameraCue,
    updatePitchTransform,
  });

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
