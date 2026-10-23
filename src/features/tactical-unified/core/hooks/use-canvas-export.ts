'use client';

import type Konva from 'konva';
import { useCallback } from 'react';
import {
  dataUrlToBlob,
  downloadBlob,
} from '@/features/tactical-unified/hooks/konva-export-helpers';
import { resolveBoundaryBoxPixelRect } from '../utils/geometry';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
  vRect?: { x: number; y: number; width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
}

export function useCanvasExport({
  stageRef,
  vRect,
  pitchRect,
}: UseCanvasExportOptions) {
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);

  const exportPng = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<string> => {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error('Canvas Stage is not initialized');
      }

      const pixelRatio = options?.scale ?? 2;
      const shouldCrop = options?.crop ?? true;

      if (shouldCrop && boundaryBox?.enabled !== false) {
        const stageW = stage.width();
        const stageH = stage.height();
        const rect = resolveBoundaryBoxPixelRect(
          boundaryBox,
          { width: stageW, height: stageH },
          pitchRect,
        );

        return stage.toDataURL({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          pixelRatio,
        });
      }

      return stage.toDataURL({ pixelRatio });
    },
    [stageRef, boundaryBox, vRect, pitchRect],
  );

  const copyToClipboard = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<void> => {
      const dataUrl = await exportPng(options);
      const blob = await dataUrlToBlob(dataUrl);
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard?.write) {
          throw new Error('Clipboard API not available');
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      } catch (err) {
        console.warn(
          '[useCanvasExport] navigator.clipboard.write failed, falling back to download:',
          err,
        );
        downloadBlob(blob, 'tactical-capture.png');
      }
    },
    [exportPng],
  );

  return {
    exportPng,
    copyToClipboard,
  };
}
