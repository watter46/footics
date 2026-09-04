'use client';

/**
 * use-canvas-event-listeners.ts
 * Global window event listener management for UnifiedCanvas:
 *  - URL params screenshot binding
 *  - Custom event (tactical:screenshot-background)
 *  - postMessage (FOOTICS_SCREENSHOT)
 *  - tactical:copy-png clipboard copy
 *  - tactical:export video/image export
 */

import { useEffect } from 'react';
import type { ExportTarget } from '@/lib/types/tactical-unified';

interface UseCanvasEventListenersOptions {
  setBackgroundImageUrl: (url: string) => void;
  setBackgroundType: (type: 'pitch' | 'image') => void;
  setIsExporting: (val: boolean) => void;
  copyToClipboard: () => void;
  runExport: (target: ExportTarget) => void;
  exportVideo: (target: ExportTarget) => Promise<Blob | null>;
}

export function useCanvasEventListeners({
  setBackgroundImageUrl,
  setBackgroundType,
  setIsExporting,
  copyToClipboard,
  runExport,
  exportVideo,
}: UseCanvasEventListenersOptions) {
  // URLパラメーター ?screenshot=<dataUrl> & 拡張機能イベント
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const screenshot = url.searchParams.get('screenshot');
    if (screenshot) {
      setBackgroundImageUrl(screenshot);
      setBackgroundType('image');
      url.searchParams.delete('screenshot');
      window.history.replaceState({}, '', url.toString());
    }

    const handleScreenshotEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setBackgroundImageUrl(detail);
        setBackgroundType('image');
      } else if (detail?.imageUrl) {
        setBackgroundImageUrl(detail.imageUrl);
        setBackgroundType('image');
      }
    };

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FOOTICS_SCREENSHOT' && e.data?.imageUrl) {
        setBackgroundImageUrl(e.data.imageUrl);
        setBackgroundType('image');
      }
    };

    window.addEventListener(
      'tactical:screenshot-background',
      handleScreenshotEvent,
    );
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener(
        'tactical:screenshot-background',
        handleScreenshotEvent,
      );
      window.removeEventListener('message', handleMessage);
    };
  }, [setBackgroundImageUrl, setBackgroundType]);

  // PNG clipboard コピー
  useEffect(() => {
    const handler = () => copyToClipboard();
    window.addEventListener('tactical:copy-png', handler);
    return () => window.removeEventListener('tactical:copy-png', handler);
  }, [copyToClipboard]);

  // 書き出しイベント受信
  useEffect(() => {
    const dispatchExportCompleted = (
      blob: Blob,
      format: ExportTarget['format'],
    ) => {
      const ext =
        format === 'mp4'
          ? blob.type.includes('webm')
            ? 'webm'
            : 'mp4'
          : 'webm';
      const filename =
        format === 'mp4'
          ? `tactical-animation.${ext}`
          : 'tactical-overlay-transparent.webm';
      window.dispatchEvent(
        new CustomEvent('tactical:export-completed', {
          detail: { blob, filename, format },
        }),
      );
    };

    const handleVideoExport = async (target: ExportTarget) => {
      setIsExporting(true);
      try {
        const videoBlob = await exportVideo(target);
        if (videoBlob) {
          dispatchExportCompleted(videoBlob, target.format);
        } else {
          window.dispatchEvent(
            new CustomEvent('tactical:export-error', {
              detail: { error: 'No video output produced' },
            }),
          );
        }
      } catch (err) {
        console.error('Video export error:', err);
        window.dispatchEvent(
          new CustomEvent('tactical:export-error', {
            detail: { error: err instanceof Error ? err.message : String(err) },
          }),
        );
      } finally {
        setIsExporting(false);
      }
    };

    const handler = (e: Event) => {
      const target = (e as CustomEvent).detail as ExportTarget;
      if (target.format === 'mp4' || target.format === 'webm') {
        void handleVideoExport(target);
      } else {
        void runExport(target);
      }
    };

    window.addEventListener('tactical:export', handler);
    return () => window.removeEventListener('tactical:export', handler);
  }, [runExport, exportVideo, setIsExporting]);
}
