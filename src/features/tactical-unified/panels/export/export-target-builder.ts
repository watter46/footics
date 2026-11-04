import {
  type BoundaryCropInfo,
  calculateBoundaryCrop,
} from '@/lib/tactical/export/video-crop-calc';
import type { BoundaryBox, ExportTarget } from '@/lib/types/tactical-unified';

export interface BuildParams {
  format: ExportTarget['format'];
  scale: number;
  keyFrameIntervalSec?: '1' | '2' | '5' | '10';
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: '60' | '240';
  boundaryBox?: BoundaryBox | null;
  stageWidth?: number;
  stageHeight?: number;
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
    stageWidth = 960,
    stageHeight = 540,
  } = params;

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
