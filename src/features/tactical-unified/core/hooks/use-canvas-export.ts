'use client';

import type Konva from 'konva';
import { useCallback } from 'react';
import {
  dataUrlToBlob,
  downloadBlob,
} from '@/features/tactical-unified/hooks/konva-export-helpers';
import { useCanvasStore } from './use-canvas-store';

export interface UseCanvasExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
}

export function useCanvasExport({ stageRef }: UseCanvasExportOptions) {
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);

  const exportPng = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<string> => {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error('Canvas Stage is not initialized');
      }

      const pixelRatio = options?.scale ?? 2;
      const shouldCrop = options?.crop ?? true;

      if (shouldCrop && boundaryBox.enabled !== false) {
        const stageW = stage.width();
        const stageH = stage.height();
        const x = (boundaryBox.x / 100) * stageW;
        const y = (boundaryBox.y / 100) * stageH;
        const width = (boundaryBox.width / 100) * stageW;
        const height = (boundaryBox.height / 100) * stageH;

        return stage.toDataURL({
          x,
          y,
          width,
          height,
          pixelRatio,
        });
      }

      return stage.toDataURL({ pixelRatio });
    },
    [stageRef, boundaryBox],
  );

  const copyToClipboard = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<void> => {
      const dataUrl = await exportPng(options);
      const blob = await dataUrlToBlob(dataUrl);
      try {
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
