import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { ExportJobConfig } from '@/lib/tactical/export/types';
import { calculateTotalDuration } from '@/lib/tactical/interpolation';
import { useTacticalAnimationStore } from '@/stores/tactical-animation-store';

export interface ExportOptions {
  scale?: number;
  backgroundColor?: string;
  bitrate?: number;
  fps?: number;
  photos?: Record<string, ImageBitmap>;
}

import { preloadPlayerPhotos } from '@/lib/tactical/export/photo-loader';
import { createSoccerBallImageBitmap } from '@/lib/tactical/soccer-ball-svg';

export function useTacticalVideoExport() {
  const isExporting = useTacticalAnimationStore((s) => s.isExporting);
  const setIsExporting = useTacticalAnimationStore((s) => s.setIsExporting);
  const scenes = useTacticalAnimationStore((s) => s.scenes);
  const orientation = useTacticalAnimationStore((s) => s.orientation);
  const teamVisibility = useTacticalAnimationStore((s) => s.teamVisibility);
  const exportFps = useTacticalAnimationStore((s) => s.exportFps);

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
        const fps = exportOptions?.fps ?? exportFps;
        const bitrate =
          exportOptions?.bitrate ?? (fps <= 30 ? 10000000 : 16000000);

        // フルHD (1080p) ベクター解像度の計算 (H.264 GPUハードウェアエンコーダ向け 16ピクセル・アライメント)
        const align16 = (n: number) => Math.round(n / 16) * 16;
        let exportWidth: number;
        let exportHeight: number;
        if (orientation === 'vertical') {
          exportWidth = 1080;
          exportHeight = align16(1080 * (105 / 68)); // 1664 (16の倍数)
        } else {
          exportHeight = 1080;
          exportWidth = align16(1080 * (105 / 68)); // 1664 (16の倍数)
        }

        const config: ExportJobConfig = {
          scenes,
          orientation,
          fps,
          bitrate,
          backgroundColor: bgColor,
          exportWidth,
          exportHeight,
          teamVisibility,
        };

        // 写真の事前ロード (ImageBitmap 化)
        const photos =
          exportOptions?.photos && Object.keys(exportOptions.photos).length > 0
            ? exportOptions.photos
            : await preloadPlayerPhotos(scenes);

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
            toast.success('MP4動画を保存しました');
            if (onComplete) onComplete();
          } else if (data.type === 'error') {
            console.error('Export worker reported error:', data.error);
            setExportError(data.error);
            toast.error(`動画保存に失敗しました: ${data.error}`);
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

        // サッカーボール 3D 光沢 ImageBitmap の事前生成 (メインスレッドのSVGレンダラーを使用)
        const baseDim = Math.min(exportWidth, exportHeight);
        const ballRadius = baseDim * 0.022;
        let ballBitmap: ImageBitmap | undefined;
        try {
          ballBitmap = await createSoccerBallImageBitmap(ballRadius);
        } catch (e) {
          console.warn(
            'Failed to create soccer ball bitmap on main thread:',
            e,
          );
        }

        const transferables: Transferable[] = [...Object.values(photos)];
        if (ballBitmap) {
          transferables.push(ballBitmap);
        }

        // Worker にエクスポート開始メッセージを送信 (ImageBitmap をゼロコピー転送)
        worker.postMessage(
          { type: 'start', config, photos, ballBitmap },
          transferables,
        );
      } catch (err) {
        console.error('Failed to start MP4 export:', err);
        setExportError(
          err instanceof Error ? err.message : 'MP4 video export failed',
        );
        setIsExporting(false);
      }
    },
    [
      isExporting,
      setIsExporting,
      scenes,
      orientation,
      exportFps,
      teamVisibility,
    ],
  );

  return {
    startExport,
    cancelExport,
    isExporting,
    exportProgress,
    exportError,
  };
}
