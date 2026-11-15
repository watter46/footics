'use client';

import type Konva from 'konva';
import { useCallback } from 'react';
import { selectDomainActiveBoundaryBox } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  downloadBlob,
  exportPngBlob as exportPngBlobHelper,
} from '../utils/canvas-export-primitives';
import { resolveBoundaryBoxPixelRect } from '../utils/geometry';

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
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const boundaryBox = useDocumentStore((s) =>
    selectDomainActiveBoundaryBox(s.project, activePhaseId),
  );

  const exportPngBlob = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<Blob> => {
      const stage = stageRef.current;
      if (!stage) {
        throw new Error('Canvas Stage is not initialized');
      }
      return exportPngBlobHelper(stage, {
        crop: options?.crop,
        scale: options?.scale,
        boundaryBox,
        pitchRect,
      });
    },
    [stageRef, boundaryBox, pitchRect],
  );

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
    [stageRef, boundaryBox, pitchRect],
  );

  const copyToClipboard = useCallback(
    async (options?: { crop?: boolean; scale?: number }): Promise<void> => {
      const blob = await exportPngBlob(options);
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
    [exportPngBlob],
  );

  return {
    exportPng,
    exportPngBlob,
    copyToClipboard,
  };
}
