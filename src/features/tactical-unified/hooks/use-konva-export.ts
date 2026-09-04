'use client';

/**
 * use-konva-export.ts
 * Export pipeline hook: PNG clipboard / single PNG / ZIP / MP4 / GIF
 */

import type Konva from 'konva';
import { useCallback } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { ExportTarget, Slide } from '@/lib/types/tactical-unified';
import { calculatePitchRect } from '../components/canvas/helpers/canvas-pitch-transform-helper';

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
      const box = activeSlide?.boundaryBox;

      const stageW = stage.width();
      const stageH = stage.height();
      const pitchRect = calculatePitchRect(
        { width: stageW, height: stageH },
        currentProject.aspectRatio,
      );

      const baseRect =
        box?.fitTarget === 'canvas'
          ? { x: 0, y: 0, width: stageW, height: stageH }
          : pitchRect;

      if (box?.enabled && box.width > 0 && box.height > 0) {
        const cropX = baseRect.x + (box.x / 100) * baseRect.width;
        const cropY = baseRect.y + (box.y / 100) * baseRect.height;
        const cropW = (box.width / 100) * baseRect.width;
        const cropH = (box.height / 100) * baseRect.height;

        return stage.toDataURL({
          x: cropX,
          y: cropY,
          width: cropW,
          height: cropH,
          pixelRatio: scale,
        });
      }

      return (
        stage.toDataURL({
          x: pitchRect.x,
          y: pitchRect.y,
          width: pitchRect.width,
          height: pitchRect.height,
          pixelRatio: scale,
        }) ?? null
      );
    },
    [stageRef, activeSlideId],
  );

  /** dataURL → Blob */
  const dataUrlToBlob = useCallback(async (dataUrl: string): Promise<Blob> => {
    const res = await fetch(dataUrl);
    return res.blob();
  }, []);

  /** ファイルダウンロードヘルパー */
  const download = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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
        download(blob, 'tactical-scene.png');
      }
    } finally {
      setIsExporting(false);
    }
  }, [captureCurrentSlide, dataUrlToBlob, download, setIsExporting]);

  /** メインエクスポート実行 */
  const runExport = useCallback(
    async (target: ExportTarget) => {
      setIsExporting(true);
      try {
        if (target.format === 'png') {
          const scale = target.scale ?? 2;
          const dataUrl = captureCurrentSlide(scale);
          if (!dataUrl) return;
          const blob = await dataUrlToBlob(dataUrl);
          download(blob, `tactical-scene.png`);
        }

        if (target.format === 'zip') {
          // 動的インポートでバンドルサイズ節約
          const { default: JSZip } = await import('jszip');
          const zip = new JSZip();
          const scale = target.scale ?? 2;

          for (const slide of project.slides) {
            if (activateSlide) await activateSlide(slide.id);
            // 次フレームを待つ
            await new Promise((r) => requestAnimationFrame(r));
            const dataUrl = captureCurrentSlide(scale, slide.id);
            if (!dataUrl) continue;
            const blob = await dataUrlToBlob(dataUrl);
            zip.file(
              `slide-${String(slide.index + 1).padStart(2, '0')}.png`,
              blob,
            );
          }

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          download(zipBlob, `tactical-slides.zip`);
        }

        // MP4/GIF はフレームキャプチャ方式 (簡易実装)
        if (target.format === 'mp4' || target.format === 'gif') {
          const slides: Slide[] =
            target.scope === 'range'
              ? (() => {
                  const from = project.slides.findIndex(
                    (s) => s.id === target.fromSlideId,
                  );
                  const to = project.slides.findIndex(
                    (s) => s.id === target.toSlideId,
                  );
                  return project.slides.slice(
                    Math.max(0, from),
                    to >= 0 ? to + 1 : undefined,
                  );
                })()
              : project.slides;

          const frames: string[] = [];
          for (const slide of slides) {
            if (activateSlide) await activateSlide(slide.id);
            await new Promise((r) => requestAnimationFrame(r));
            const dataUrl = captureCurrentSlide(2, slide.id);
            if (dataUrl) frames.push(dataUrl);
          }

          if (target.format === 'gif') {
            // gif.js を動的インポート
            const { default: GIF } = await import('gif.js');
            const stage = stageRef.current;
            if (!stage) return;

            const gif = new GIF({
              workers: 2,
              quality: 10,
              width: stage.width(),
              height: stage.height(),
            });

            for (const dataUrl of frames) {
              const img = await new Promise<HTMLImageElement>((res) => {
                const i = new Image();
                i.onload = () => res(i);
                i.src = dataUrl;
              });
              gif.addFrame(img, { delay: 800 });
            }

            await new Promise<void>((res) => {
              gif.on('finished', (blob: Blob) => {
                download(blob, 'tactical-animation.gif');
                res();
              });
              gif.render();
            });
          } else {
            // MP4: 現時点ではフレームをZIPで提供 (mp4-muxer はWASMが必要なため別タスク)
            const { default: JSZip } = await import('jszip');
            const zip = new JSZip();
            frames.forEach((f, i) => {
              const b64 = f.split(',')[1] ?? '';
              zip.file(`frame-${String(i).padStart(3, '0')}.png`, b64, {
                base64: true,
              });
            });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            download(zipBlob, 'tactical-frames.zip');
          }
        }
      } finally {
        setIsExporting(false);
        closeExportModal();
      }
    },
    [
      captureCurrentSlide,
      dataUrlToBlob,
      download,
      project.slides,
      activateSlide,
      setIsExporting,
      closeExportModal,
      stageRef,
    ],
  );

  return { copyToClipboard, runExport, captureCurrentSlide };
}
