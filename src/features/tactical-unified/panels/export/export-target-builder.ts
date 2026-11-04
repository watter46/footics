import {
  type BoundaryCropInfo,
  calculateBoundaryCrop,
} from '@/lib/tactical/export/video-crop-calc';
import type {
  AspectRatio,
  BoundaryBox,
  ExportTarget,
} from '@/lib/types/tactical-unified';

const DEFAULT_STAGE_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  '16:9': { width: 960, height: 540 },
  '9:16': { width: 540, height: 960 },
  '4:5': { width: 540, height: 675 },
  '1:1': { width: 540, height: 540 },
};

export interface BuildParams {
  format: ExportTarget['format'];
  scale: number;
  keyFrameIntervalSec?: '1' | '2' | '5' | '10';
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: '60' | '240';
  boundaryBox?: BoundaryBox | null;
  stageWidth?: number;
  stageHeight?: number;
  aspectRatio?: AspectRatio;
}

export type BuiltExportTarget = ExportTarget & {
  boundaryBox?: BoundaryBox | null;
  cropInfo?: BoundaryCropInfo;
};

export function buildExportTarget(params: BuildParams): BuiltExportTarget {
  const {
    format,
    scale,
    keyFrameIntervalSec = '2',
    latencyMode = 'realtime',
    maxQueueSize = '60',
    boundaryBox = null,
    aspectRatio = '16:9',
  } = params;

  const defaultDim =
    DEFAULT_STAGE_DIMENSIONS[aspectRatio] ?? DEFAULT_STAGE_DIMENSIONS['16:9'];
  const stageWidth = params.stageWidth ?? defaultDim.width;
  const stageHeight = params.stageHeight ?? defaultDim.height;

  const cropInfo = calculateBoundaryCrop(
    boundaryBox,
    stageWidth,
    stageHeight,
    scale,
  );

  let baseTarget: ExportTarget;
  if (format === 'png') {
    baseTarget = { format: 'png', scope: 'current', scale };
  } else if (format === 'zip') {
    baseTarget = { format: 'zip', scope: 'all', scale };
  } else if (format === 'mp4') {
    baseTarget = {
      format: 'mp4',
      scope: 'all',
      fps: '60',
      scale,
      quality: 'high',
      bitrateMbps: '24',
      h264Profile: 'high',
      keyFrameIntervalSec,
      latencyMode,
      maxQueueSize,
    };
  } else if (format === 'webm') {
    baseTarget = {
      format: 'webm',
      scope: 'all',
      fps: '60',
      scale,
      transparent: true,
      keyFrameIntervalSec,
      latencyMode,
      maxQueueSize,
    };
  } else {
    throw new Error(`Unsupported export format: ${format}`);
  }

  return {
    ...baseTarget,
    boundaryBox,
    cropInfo,
  };
}
