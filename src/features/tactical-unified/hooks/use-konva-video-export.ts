'use client';

/**
 * use-konva-video-export.ts
 * Dedicated React hook for Boundary Video Export (MP4 & Transparent WebM)
 * utilizing off-thread Web Worker pipeline for zero UI freeze.
 */

import type Konva from 'konva';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/components/canvas/canvas-registry';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  type BoundaryCropInfo,
  exportTacticalVideo,
} from '@/lib/tactical/export/video-export-engine';
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
      const stage = stageRef.current;
      if (!stage) {
        throw new Error('Canvas Stage is not available');
      }

      if (target.format !== 'mp4' && target.format !== 'webm') {
        throw new Error(`Unsupported video format: ${target.format}`);
      }

      isCancelledRef.current = false;
      const currentSlides = useTacticalUnifiedStore.getState().project.slides;
      if (currentSlides.length === 0) {
        throw new Error('No slides available to export');
      }

      const activeSlide = currentSlides.find((s) => s.id === activeSlideId);
      const boundaryBox = activeSlide?.boundaryBox ?? null;

      const stageWidth = stage.width();
      const stageHeight = stage.height();
      const totalDurationMs = calculateUnifiedTotalDuration(currentSlides);

      const fps = Number.parseInt(target.fps, 10) || 30;
      const scale = target.scale ?? 2;

      const handleProgress = (p: ExportProgress) => {
        setVideoProgress(p);
        onProgressCallback?.(p);
      };

      const handleRenderFrame = async (timeMs: number) => {
        applyFrameToCanvas(
          timeMs,
          nodesRegistryRef.current,
          stageWidth,
          stageHeight,
          true, // Synchronous draw for offline video frame capture fallback
        );
      };

      const handleCaptureFrame = (
        cropInfo: BoundaryCropInfo,
      ): HTMLCanvasElement | null => {
        return stage.toCanvas({
          x: cropInfo.cropX,
          y: cropInfo.cropY,
          width: cropInfo.cropW,
          height: cropInfo.cropH,
          pixelRatio: scale,
        });
      };

      const handleSetBackgroundVisible = (visible: boolean) => {
        const bgLayer = nodesRegistryRef.current.backgroundLayer;
        if (bgLayer) {
          bgLayer.visible(visible);
          bgLayer.batchDraw();
        }
      };

      const aspectRatio =
        useTacticalUnifiedStore.getState().project.aspectRatio;

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

      console.log(
        `%c[Footics Export Hook] Triggered video export: ${target.format.toUpperCase()} (${fps}fps, scale=${scale}, bitrate=${bitrate ? `${bitrate / 1_000_000}Mbps` : 'auto'}, profile=${h264Profile ?? 'high'}, keyFrameGOP=${keyFrameIntervalSec}s, latencyMode=${latencyMode}, maxQueue=${maxQueueSize}, slides=${currentSlides.length}, duration=${totalDurationMs}ms)`,
        'color: #0284c7; font-weight: bold;',
      );

      try {
        const resultBlob = await exportTacticalVideo({
          format: target.format,
          fps,
          scale,
          quality,
          bitrate,
          h264Profile,
          keyFrameIntervalSec,
          latencyMode,
          maxQueueSize,
          transparent,
          totalDurationMs: totalDurationMs > 0 ? totalDurationMs : 3000,
          boundaryBox,
          stageWidth,
          stageHeight,
          slides: currentSlides,
          aspectRatio,
          onRenderFrame: handleRenderFrame,
          onCaptureFrame: handleCaptureFrame,
          onSetBackgroundVisible: handleSetBackgroundVisible,
          onProgress: handleProgress,
          checkCancelled: () => isCancelledRef.current,
        });

        console.log(
          `%c[Footics Export Hook] Export successfully finished! Blob size: ${(resultBlob.size / 1024 / 1024).toFixed(2)} MB`,
          'color: #16a34a; font-weight: bold;',
        );

        return resultBlob;
      } finally {
        // Reset stage state to Slide 0
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
