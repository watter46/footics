import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExportJobConfig } from '@/lib/tactical/export/types';
import { calculateTotalDuration } from '@/lib/tactical/interpolation';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string;
  bitrate?: number;
  fps?: number;
}

import { preloadPlayerPhotos } from '@/lib/tactical/export/photo-loader';

export function useTacticalVideoExport() {
  const isExporting = useTacticalAnimationStore((s) => s.isExporting);
  const setIsExporting = useTacticalAnimationStore((s) => s.setIsExporting);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const orientation = useTacticalAnimationStore((s) => s.orientation);

  const workerRef = useRef<Worker | null>(null);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // コンポーネント破棄時に Worker をクリーンアップ
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const cancelExport = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'cancel' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsExporting(false);
    setExportProgress(0);
  }, [setIsExporting]);

  /**
   * Web Worker を用いた完全バックグラウンド・爆速動画エクスポート
   */
  const startExport = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (arg1?: any, arg2?: any, arg3?: any, arg4?: any) => {
      if (isExporting) return;

      // 引数の後方互換性ハンドリング
      let onComplete: (() => void) | undefined;
      let exportOptions: ExportOptions | undefined;

      if (arg1 && typeof arg1 === 'object' && 'find' in arg1) {
        // 従来のシグネチャ: startExport(stage, canvas, onComplete, exportOptions)
        onComplete = typeof arg3 === 'function' ? arg3 : undefined;
        exportOptions =
          typeof arg4 === 'object' ? (arg4 as ExportOptions) : undefined;
      } else if (typeof arg1 === 'function') {
        // startExport(onComplete, exportOptions)
        onComplete = arg1;
        exportOptions =
          typeof arg2 === 'object' ? (arg2 as ExportOptions) : undefined;
      } else {
        // startExport(exportOptions, onComplete)
        exportOptions =
          typeof arg1 === 'object' ? (arg1 as ExportOptions) : undefined;
        onComplete = typeof arg2 === 'function' ? arg2 : undefined;
      }

      setIsExporting(true);
      setExportError(null);
      setExportProgress(0);

      try {
        const totalDurationMs = calculateTotalDuration(scenes);
        if (totalDurationMs <= 0 || scenes.length <= 1) {
          throw new Error('エクスポートには2つ以上のシーンが必要です');
        }

        // WebCodecs サポート確認
        if (typeof window === 'undefined' || !('VideoEncoder' in window)) {
          throw new Error(
            'お使いのブラウザは WebCodecs (VideoEncoder) に対応していません。最新の Chrome, Edge, Safari をご利用ください。',
          );
        }

        const bgColor = exportOptions?.backgroundColor ?? '#020617';
        const fps = exportOptions?.fps ?? 60;
        const bitrate = exportOptions?.bitrate ?? 16000000;

        // フルHD (1080p) ベクター解像度の計算
        let exportWidth: number;
        let exportHeight: number;
        if (orientation === 'vertical') {
          exportWidth = 1080;
          exportHeight = Math.round(1080 * (105 / 68)); // 1668
        } else {
          exportHeight = 1080;
          exportWidth = Math.round(1080 * (105 / 68)); // 1668
        }

        // H.264 仕様の偶数化
        if (exportWidth % 2 !== 0) exportWidth++;
        if (exportHeight % 2 !== 0) exportHeight++;

        const config: ExportJobConfig = {
          scenes,
          orientation,
          fps,
          bitrate,
          backgroundColor: bgColor,
          exportWidth,
          exportHeight,
        };

        // 写真の事前ロード (ImageBitmap 化)
        const photos = await preloadPlayerPhotos(scenes);
        const transferables = Object.values(photos);

        // 既存 Worker の破棄
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }

        // Web Worker の起動
        const worker = new Worker(
          new URL('../workers/tactical-export.worker.ts', import.meta.url),
          { type: 'module' },
        );
        workerRef.current = worker;

        worker.onmessage = (event) => {
          const data = event.data;

          if (data.type === 'progress') {
            setExportProgress(data.progress);
          } else if (data.type === 'complete') {
            setExportProgress(100);

            // MP4 Blob の生成とダウンロード
            const mp4Blob = new Blob([data.buffer], { type: 'video/mp4' });
            const url = URL.createObjectURL(mp4Blob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            const timestamp = new Date()
              .toISOString()
              .slice(0, 19)
              .replace(/:/g, '-');
            a.download = `tactical_animation_${timestamp}.mp4`;
            a.click();

            setTimeout(() => {
              URL.revokeObjectURL(url);
              document.body.removeChild(a);
            }, 1000);

            if (workerRef.current === worker) {
              worker.terminate();
              workerRef.current = null;
            }
            setIsExporting(false);
            if (onComplete) onComplete();
          } else if (data.type === 'error') {
            console.error('Export worker reported error:', data.error);
            setExportError(data.error);
            if (workerRef.current === worker) {
              worker.terminate();
              workerRef.current = null;
            }
            setIsExporting(false);
          }
        };

        worker.onerror = (err) => {
          console.error('Worker runtime error:', err);
          setExportError('動画エクスポート中にエラーが発生しました');
          if (workerRef.current === worker) {
            worker.terminate();
            workerRef.current = null;
          }
          setIsExporting(false);
        };

        // Worker にエクスポート開始メッセージを送信 (ImageBitmap をゼロコピー転送)
        worker.postMessage({ type: 'start', config, photos }, transferables);
      } catch (err) {
        console.error('Failed to start MP4 export:', err);
        setExportError(
          err instanceof Error ? err.message : 'MP4 video export failed',
        );
        setIsExporting(false);
      }
    },
    [isExporting, setIsExporting, scenes, orientation],
  );

  return {
    startExport,
    cancelExport,
    isExporting,
    exportProgress,
    exportError,
  };
}
