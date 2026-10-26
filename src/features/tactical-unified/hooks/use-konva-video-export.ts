/**
 * use-konva-video-export.ts
 * Dedicated React hook for Boundary Video Export (MP4 & Transparent WebM)
 * utilizing off-thread Web Worker pipeline for zero UI freeze.
 */

import type Konva from 'konva';
import { useCallback, useRef, useState } from 'react';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
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

import {
  executeVideoExport,
  validateVideoExportParams,
} from './konva-video-export-helper';

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
