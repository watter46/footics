import type Konva from 'konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { exportTacticalVideo } from '@/lib/tactical/export/video-export-engine';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
import type {
  ExportProgress,
  ExportTarget,
  Slide,
} from '@/lib/types/tactical-unified';

export type VideoExportTarget = Extract<
  ExportTarget,
  { format: 'mp4' | 'webm' }
>;

export function extractTargetOptions(target: VideoExportTarget) {
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

export function validateVideoExportParams(
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

export interface ExecuteVideoExportParams {
  target: VideoExportTarget;
  currentSlides: Slide[];
  activeSlideId: string | null;
  stage: Konva.Stage;
  nodesRegistry: CanvasNodesRegistry;
  applyFrameToCanvas: (
    timeMs: number,
    registry: CanvasNodesRegistry | undefined,
    stageWidth: number,
    stageHeight: number,
    synchronous?: boolean,
  ) => void;
  onProgress: (p: ExportProgress) => void;
  isCancelled: () => boolean;
}

export async function executeVideoExport({
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
    pitchTransform: activeSlide?.pitchTransform,
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
