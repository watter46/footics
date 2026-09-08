'use client';

/**
 * use-konva-video-export.ts
 * Dedicated React hook for Boundary Video Export (MP4 & Transparent WebM)
 * utilizing off-thread Web Worker pipeline for zero UI freeze.
 */

import type Konva from 'konva';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/objects/canvas';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { exportTacticalVideo } from '@/lib/tactical/export/video-export-engine';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  ExportProgress,
  ExportTarget,
} from '@/lib/types/tactical-unified';

interface UseKonvaVideoExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
  nodesRegistryRef: React.MutableRefObject<CanvasNodesRegistry>;
  applyFrameToCanvas: (
    timeMs: number,
    registry: CanvasNodesRegistry | undefined,
    stageWidth: number,
    stageHeight: number,
    synchronous?: boolean,
  ) => void;
}

type VideoExportTarget = Extract<ExportTarget, { format: 'mp4' | 'webm' }>;

function extractTargetOptions(target: VideoExportTarget) {
  const quality = target.format === 'mp4' ? target.quality : 'high';
  const transparent = target.format === 'webm' ? target.transparent : false;
  const bitrate =
    target.format === 'mp4' && 'bitrateMbps' in target && target.bitrateMbps
      ? Number.parseInt(target.bitrateMbps, 10) * 1_000_000
      : undefined;
  const h264Profile =
    target.format === 'mp4' && 'h264Profile' in target
      ? target.h264Profile
      : undefined;
  const keyFrameIntervalSec =
    'keyFrameIntervalSec' in target && target.keyFrameIntervalSec
      ? Number.parseInt(target.keyFrameIntervalSec, 10)
      : 2;
  const latencyMode =
    'latencyMode' in target && target.latencyMode
      ? target.latencyMode
      : 'realtime';
  const maxQueueSize =
    'maxQueueSize' in target && target.maxQueueSize
      ? Number.parseInt(target.maxQueueSize, 10)
      : 60;
  return {
    quality,
    transparent,
    bitrate,
    h264Profile,
    keyFrameIntervalSec,
    latencyMode,
    maxQueueSize,
  };
}

function validateVideoExportParams(
  stage: Konva.Stage | null,
  target: ExportTarget,
  slidesCount: number,
): { stage: Konva.Stage; videoTarget: VideoExportTarget } {
  if (!stage) {
    throw new Error('Canvas Stage is not available');
  }
  if (target.format !== 'mp4' && target.format !== 'webm') {
    throw new Error(`Unsupported video format: ${target.format}`);
  }
  if (slidesCount === 0) {
    throw new Error('No slides available to export');
  }
  return { stage, videoTarget: target };
}

interface ExecuteVideoExportParams {
  target: VideoExportTarget;
  currentSlides: import('@/lib/types/tactical-unified').Slide[];
  activeSlideId: string | null;
  stage: Konva.Stage;
  nodesRegistry: CanvasNodesRegistry;
  applyFrameToCanvas: UseKonvaVideoExportOptions['applyFrameToCanvas'];
  onProgress: (p: ExportProgress) => void;
  isCancelled: () => boolean;
}

async function executeVideoExport({
  target,
  currentSlides,
  activeSlideId,
  stage,
  nodesRegistry,
  applyFrameToCanvas,
  onProgress,
  isCancelled,
}: ExecuteVideoExportParams): Promise<Blob> {
  const activeSlide = currentSlides.find((s) => s.id === activeSlideId);
  const boundaryBox = activeSlide?.boundaryBox ?? null;
  const stageWidth = stage.width();
  const stageHeight = stage.height();
  const totalDurationMs = calculateUnifiedTotalDuration(currentSlides);
  const fps = Number.parseInt(target.fps, 10) || 30;
  const scale = target.scale ?? 2;

  const targetOptions = extractTargetOptions(target);
  const aspectRatio = useTacticalUnifiedStore.getState().project.aspectRatio;

  return exportTacticalVideo({
    format: target.format,
    fps,
    scale,
    ...targetOptions,
    totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 3000,
    boundaryBox,
    stageWidth,
    stageHeight,
    slides: currentSlides,
    aspectRatio,
    onRenderFrame: async (timeMs) => {
      applyFrameToCanvas(timeMs, nodesRegistry, stageWidth, stageHeight, true);
    },
    onCaptureFrame: (cropInfo) =>
      stage.toCanvas({
        x: cropInfo.cropX,
        y: cropInfo.cropY,
        width: cropInfo.cropW,
        height: cropInfo.cropH,
        pixelRatio: scale,
      }),
    onSetBackgroundVisible: (visible) => {
      const bgLayer = nodesRegistry.backgroundLayer;
      if (bgLayer) {
        bgLayer.visible(visible);
        bgLayer.batchDraw();
      }
    },
    onProgress,
    checkCancelled: isCancelled,
  });
}

export function useKonvaVideoExport({
  stageRef,
  nodesRegistryRef,
  applyFrameToCanvas,
}: UseKonvaVideoExportOptions) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const [videoProgress, setVideoProgress] = useState<ExportProgress | null>(
    null,
  );
  const isCancelledRef = useRef(false);

  const cancelVideoExport = useCallback(() => {
    isCancelledRef.current = true;
  }, []);

  const exportVideo = useCallback(
    async (
      target: ExportTarget,
      onProgressCallback?: (p: ExportProgress) => void,
    ): Promise<Blob | null> => {
      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      const { stage, videoTarget } = validateVideoExportParams(
        stageRef.current,
        target,
        currentSlides.length,
      );

      isCancelledRef.current = false;
      const stageWidth = stage.width();
      const stageHeight = stage.height();

      try {
        return await executeVideoExport({
          target: videoTarget,
          currentSlides,
          activeSlideId,
          stage,
          nodesRegistry: nodesRegistryRef.current,
          applyFrameToCanvas,
          onProgress: (p) => {
            setVideoProgress(p);
            onProgressCallback?.(p);
          },
          isCancelled: () => isCancelledRef.current,
        });
      } finally {
        if (currentSlides.length > 0) {
          applyFrameToCanvas(
            0,
            nodesRegistryRef.current,
            stageWidth,
            stageHeight,
          );
        }
      }
    },
    [stageRef, nodesRegistryRef, applyFrameToCanvas, activeSlideId],
  );

  return {
    exportVideo,
    cancelVideoExport,
    videoProgress,
  };
}
