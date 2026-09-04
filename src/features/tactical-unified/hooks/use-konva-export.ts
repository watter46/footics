'use client';

/**
 * use-konva-export.ts
 * Export pipeline hook: PNG clipboard / single PNG / ZIP / MP4 / GIF
 */

import type Konva from 'konva';
import { useCallback } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ExportTarget } from '@/lib/types/tactical-unified';
import {
  calculateExportCropRect,
  dataUrlToBlob,
  downloadBlob,
  executeExportFormat,
} from './konva-export-helpers';

interface UseKonvaExportOptions {
  stageRef: React.RefObject<Konva.Stage | null>;
  /** スライドごとにステージを更新するコールバック (アニメーション書き出し用) */
  activateSlide?: (slideId: string) => Promise<void>;
}

export function useKonvaExport({
  stageRef,
  activateSlide,
}: UseKonvaExportOptions) {
  const setIsExporting = useTacticalUnifiedStore((s) => s.setIsExporting);
  const closeExportModal = useTacticalUnifiedStore((s) => s.closeExportModal);
  const project = useTacticalUnifiedStore((s) => s.project);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);

  /** Stage → PNG dataURL */
  const captureCurrentSlide = useCallback(
    (scale = 2, targetSlideId?: string): string | null => {
      const stage = stageRef.current;
      if (!stage) return null;

      const currentProject = useTacticalUnifiedStore.getState().project;
      const currentActiveId =
        targetSlideId ??
        useTacticalUnifiedStore.getState().activeSlideId ??
        activeSlideId;
      const activeSlide = currentProject.slides.find(
        (s) => s.id === currentActiveId,
      );

      const crop = calculateExportCropRect({
        stageSize: { width: stage.width(), height: stage.height() },
        aspectRatio: currentProject.aspectRatio,
        boundaryBox: activeSlide?.boundaryBox,
      });

      return stage.toDataURL({
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        pixelRatio: scale,
      });
    },
    [stageRef, activeSlideId],
  );

  /** PNG clipboard (📋 ボタン) */
  const copyToClipboard = useCallback(async () => {
    setIsExporting(true);
    await new Promise((r) => setTimeout(r, 50));
    try {
      const dataUrl = captureCurrentSlide(2);
      if (!dataUrl) return;
      const blob = await dataUrlToBlob(dataUrl);
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      } catch {
        downloadBlob(blob, 'tactical-scene.png');
      }
    } finally {
      setIsExporting(false);
    }
  }, [captureCurrentSlide, setIsExporting]);

  /** メインエクスポート実行 */
  const runExport = useCallback(
    async (target: ExportTarget) => {
      setIsExporting(true);
      try {
        await executeExportFormat(target, {
          stage: stageRef.current,
          slides: project.slides,
          captureSlide: captureCurrentSlide,
          activateSlide,
        });
      } finally {
        setIsExporting(false);
        closeExportModal();
      }
    },
    [
      captureCurrentSlide,
      project.slides,
      activateSlide,
      setIsExporting,
      closeExportModal,
      stageRef,
    ],
  );

  return { copyToClipboard, runExport, captureCurrentSlide };
}

export { calculateExportCropRect } from './konva-export-helpers';
