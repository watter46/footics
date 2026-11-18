'use client';

import {
  type PointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useExportPreviewAnimation } from '@/features/tactical-unified/panels/export/export-preview-player';
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhase,
  selectDomainActivePhaseAspectRatio,
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/engine/director-camera';
import { isBoundaryCropActive } from '@/lib/tactical/export/video-crop-calc';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import { PreviewBoundaryOverlay } from './preview-boundary-overlay';
import { buildPlayerPhotoRecord } from './preview-player-photos';
import { usePreviewWheelZoom } from './use-preview-wheel-zoom';
import { useSplitPreviewCommands } from './use-split-preview-commands';

export function TacticalSplitPreviewPanel() {
  const { playbackStore } = useTacticalStoresContext();
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const togglePlayback = usePlaybackStore((s) => s.togglePlayback);

  const slides = useDocumentStore((s) =>
    selectDomainActivePhaseSlides(s.project, activePhaseId),
  );
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const aspectRatio = useDocumentStore((s) =>
    selectDomainActivePhaseAspectRatio(s.project, activePhaseId),
  );
  const boundaryBox = useDocumentStore((s) =>
    selectDomainActiveBoundaryBox(s.project, activePhaseId),
  );
  const pitchAppearance = useDocumentStore((s) => s.project.pitchAppearance);
  const screenBackground = useDocumentStore((s) => s.project.screenBackground);
  const targetPhaseId = activePhase?.id ?? activePhaseId;

  const {
    updatePitchTransform,
    updatePhaseBoundaryBox,
    upsertGlobalCameraKeyframe,
    upsertActionCameraCue,
  } = useSplitPreviewCommands({
    targetPhaseId,
    activeSlideId: activeSlide?.id,
    activeSlidePitchTransform: activeSlide?.pitchTransform,
  });

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

  const isDirectorCameraActive = hasActiveDirectorCameraTrack(
    activePhase?.directorCamera,
  );
  const resolveCameraAtTime = useCallback(
    (timeMs: number) => {
      const resolvedCamera: PitchTransform | null = isDirectorCameraActive
        ? resolveSyntheticDirectorCamera(activePhase!.directorCamera!, timeMs, {
            isEditing: !isPlaying,
          })
        : (activeSlide?.pitchTransform ?? null);
      const activeCue = activePhase?.directorCamera?.actionCues?.find(
        (c) =>
          timeMs >= c.startTimeMs &&
          timeMs <= c.startTimeMs + (c.durationMs ?? 1000),
      );
      return { activeCue, resolvedCamera };
    },
    [
      activePhase,
      activeSlide?.pitchTransform,
      isDirectorCameraActive,
      isPlaying,
    ],
  );
  const getCurrentTimeMs = useCallback(
    () => Number(playbackStore.getState().timeMs),
    [playbackStore],
  );

  // 境界線の状態
  const isBoundaryActive = isBoundaryCropActive(boundaryBox);

  const allPhasePlayers = useMemo(
    () => slides.flatMap((s) => s.players ?? []),
    [slides],
  );
  const playerPhotoMap = usePlayerPhotoRegistry(allPhasePlayers);
  const playerPhotos = useMemo(
    () => buildPlayerPhotoRecord(allPhasePlayers, playerPhotoMap),
    [allPhasePlayers, playerPhotoMap],
  );

  const directorCameraOptions = useMemo(
    () => ({ isEditing: !isPlaying }),
    [isPlaying],
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
    directorCameraOptions,
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
    const { resolvedCamera } = resolveCameraAtTime(getCurrentTimeMs());
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
    } catch {}
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current || !activeSlide) return;
    const base: PitchTransform = latestPitchTransformRef.current ??
      resolveCameraAtTime(getCurrentTimeMs()).resolvedCamera ??
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
      const currentTimeMs = getCurrentTimeMs();
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
    } catch {}
  };

  usePreviewWheelZoom({
    containerRef,
    activeSlide,
    getCurrentTimeMs,
    resolveCameraAtTime,
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

          {/* 静止時 かつ 境界線表示時: 編集用ドラッグ枠 & 暗転マスク */}
          {Boolean(boundaryBox?.visible) && !isPlaying && boundaryBox && (
            <PreviewBoundaryOverlay
              boundaryBox={boundaryBox}
              containerRef={containerRef}
              onCommit={updatePhaseBoundaryBox}
            />
          )}
        </div>
      </div>
    </div>
  );
}
