import type { ExportTarget } from '@/lib/types/tactical-unified';

interface BuildParams {
  format: ExportTarget['format'];
  scale: number;
  keyFrameIntervalSec: '1' | '2' | '5' | '10';
  latencyMode: 'realtime' | 'quality';
  maxQueueSize: '60' | '240';
}

export function buildExportTarget(params: BuildParams): ExportTarget {
  const { format, scale, keyFrameIntervalSec, latencyMode, maxQueueSize } =
    params;

  if (format === 'png') {
    return { format: 'png', scope: 'current', scale };
  }
  if (format === 'zip') {
    return { format: 'zip', scope: 'all', scale };
  }
  if (format === 'mp4') {
    return {
      format: 'mp4',
      scope: 'all',
      fps: '60',
      scale: 2,
      quality: 'high',
      bitrateMbps: '24',
      h264Profile: 'high',
      keyFrameIntervalSec,
      latencyMode,
      maxQueueSize,
    };
  }
  if (format === 'webm') {
    return {
      format: 'webm',
      scope: 'all',
      fps: '60',
      scale: 2,
      transparent: true,
      keyFrameIntervalSec,
      latencyMode,
      maxQueueSize,
    };
  }
  return { format: 'gif', scope: 'all', fps: '15' };
}
