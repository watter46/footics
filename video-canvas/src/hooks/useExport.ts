import type Konva from 'konva';
import { useCallback } from 'react';
import { useEditorStore } from '@/stores/useEditorStore';

/** 最大最適化幅（4Kまで100%解像度を完全維持） */
const MAX_OPTIMIZED_WIDTH = 3840;

export interface ExportBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExportOptions {
  bounds?: ExportBounds;
  fitScale?: number;
  beforeExport?: () => void;
  afterExport?: () => void;
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
      options?: ExportOptions | ExportBounds,
    ) => {
      if (!stage) {
        console.warn('[useExport] Stage ref is null, skipping export.');
        return;
      }

      setExportStatus('loading', type);

      const opts: ExportOptions =
        options && 'x' in options
          ? { bounds: options as ExportBounds }
          : (options as ExportOptions) || {};

      try {
        const stageWidth = stage.width();
        const stageHeight = stage.height();

        if (stageWidth === 0 || stageHeight === 0) {
          setExportStatus('idle');
          return;
        }

        const exportArea = opts.bounds || {
          x: 0,
          y: 0,
          width: stageWidth,
          height: stageHeight,
        };

        // 一時的にUIレイヤー等を非表示にするコールバックを実行
        if (opts.beforeExport) {
          opts.beforeExport();
        }

        // オリジナルの等倍解像度 (1:1) を完全に保証するスケール計算
        const baseRatio =
          opts.fitScale && opts.fitScale > 0 ? 1 / opts.fitScale : 2;
        const targetWidth = exportArea.width * baseRatio;
        const pixelRatio =
          targetWidth > MAX_OPTIMIZED_WIDTH
            ? MAX_OPTIMIZED_WIDTH / exportArea.width
            : baseRatio;

        const dataUrl = stage.toDataURL({
          x: exportArea.x,
          y: exportArea.y,
          width: exportArea.width,
          height: exportArea.height,
          pixelRatio,
          mimeType: 'image/png',
        });

        // UIレイヤーの表示を復元
        if (opts.afterExport) {
          opts.afterExport();
        }

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
        // エラー時もUIを確実に復元
        if (opts.afterExport) {
          opts.afterExport();
        }
        setExportStatus('error');
        setTimeout(() => setExportStatus('idle'), 3000);
      }
    },
    [setExportStatus],
  );

  return { performExport };
}
