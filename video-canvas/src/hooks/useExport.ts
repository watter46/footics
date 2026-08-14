import type Konva from 'konva';
import { useCallback } from 'react';
import { useEditorStore } from '@/stores/useEditorStore';

/** 最大最適化幅（画像のコピー・保存時のスケール計算用） */
const MAX_OPTIMIZED_WIDTH = 2560;

export interface ExportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Konva Stage からのエクスポート（クリップボードコピー / PNGダウンロード）を管理するフック。
 */
export function useExport() {
  const setExportStatus = useEditorStore((state) => state.setExportStatus);

  const performExport = useCallback(
    async (
      stage: Konva.Stage | null,
      type: 'copy' | 'save',
      bounds?: ExportBounds,
    ) => {
      if (!stage) {
        console.warn('[useExport] Stage ref is null, skipping export.');
        return;
      }

      setExportStatus('loading', type);

      try {
        const stageWidth = stage.width();
        const stageHeight = stage.height();

        if (stageWidth === 0 || stageHeight === 0) {
          setExportStatus('idle');
          return;
        }

        const exportArea = bounds || {
          x: 0,
          y: 0,
          width: stageWidth,
          height: stageHeight,
        };

        // スケール計算（高解像度を保持）
        const pixelRatio =
          exportArea.width > MAX_OPTIMIZED_WIDTH
            ? MAX_OPTIMIZED_WIDTH / exportArea.width
            : 2; // 2x レティナ品質でエクスポート

        const dataUrl = stage.toDataURL({
          x: exportArea.x,
          y: exportArea.y,
          width: exportArea.width,
          height: exportArea.height,
          pixelRatio,
          mimeType: 'image/png',
        });

        if (type === 'copy') {
          // --- クリップボードへコピー ---
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob }),
          ]);
        } else {
          // --- PNGファイルとしてダウンロード ---
          const link = document.createElement('a');
          link.download = `video-canvas-${Date.now()}.png`;
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        setExportStatus('success');
        setTimeout(() => setExportStatus('idle'), 3000);
      } catch (err) {
        console.error(`[useExport] Failed to ${type}:`, err);
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    },
    [setExportStatus],
  );

  return { performExport };
}
