/**
 * canvas-export-primitives.ts
 * Core primitives for Konva canvas stage export and file download.
 */

import type Konva from 'konva';
import type { BoundaryBox } from '@/lib/types/tactical-unified';
import { resolveBoundaryBoxPixelRect } from './geometry';

export function stageToBlob(
  stage: Konva.Stage,
  config?: Parameters<Konva.Stage['toBlob']>[0],
): Promise<Blob | null> {
  return new Promise((resolve) => {
    stage.toBlob({
      ...config,
      callback: (blob) => resolve(blob),
    });
  });
}

export async function exportPngBlob(
  stage: Konva.Stage,
  options?: {
    crop?: boolean;
    scale?: number;
    boundaryBox?: BoundaryBox | null;
    pitchRect?: { x: number; y: number; width: number; height: number };
  },
): Promise<Blob> {
  const pixelRatio = options?.scale ?? 2;
  const shouldCrop = options?.crop ?? true;
  const boundaryBox = options?.boundaryBox;

  let config: Parameters<Konva.Stage['toBlob']>[0] = {
    mimeType: 'image/png',
    pixelRatio,
  };

  if (shouldCrop && boundaryBox?.enabled !== false && boundaryBox) {
    const stageW = stage.width();
    const stageH = stage.height();
    const rect = resolveBoundaryBoxPixelRect(
      boundaryBox,
      { width: stageW, height: stageH },
      options?.pitchRect,
    );
    config = {
      ...config,
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  }

  const blob = await stageToBlob(stage, config);
  if (!blob) {
    throw new Error('Failed to create PNG blob from canvas stage');
  }
  return blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
