import type React from 'react';
import { useCallback } from 'react';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';
import type { VideoGroup } from '../utils/grouping';

export interface UseScreenshotActionsOptions {
  showToast?: (msg: string) => void;
}

export interface UseScreenshotActionsReturn {
  handleDownloadSingle: (
    screenshot: CapturedScreenshot,
    e?: React.MouseEvent,
  ) => void;
  handleDownloadGroup: (group: VideoGroup) => Promise<void>;
  handleOpenCanvas: (id: string) => void;
}

export function useScreenshotActions(
  options: UseScreenshotActionsOptions = {},
): UseScreenshotActionsReturn {
  const { showToast } = options;

  const handleDownloadSingle = useCallback(
    (screenshot: CapturedScreenshot, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const a = document.createElement('a');
      a.href = screenshot.imageDataUrl;
      const cleanTitle = screenshot.videoTitle.replace(/[/\\?%*:|"<>]/g, '_');
      a.download = `footics_${cleanTitle}_${screenshot.id}.png`;
      a.click();
    },
    [],
  );

  const handleDownloadGroup = useCallback(
    async (group: VideoGroup) => {
      showToast?.(
        `⏳ ${group.count} 枚のスクリーンショットをダウンロード中...`,
      );
      for (let i = 0; i < group.screenshots.length; i++) {
        const s = group.screenshots[i];
        handleDownloadSingle(s);
        await new Promise((r) => setTimeout(r, 200));
      }
      showToast?.(`✅ ${group.count} 枚のダウンロードが完了しました`);
    },
    [handleDownloadSingle, showToast],
  );

  const handleOpenCanvas = useCallback((id: string) => {
    const canvasUrl =
      typeof browser !== 'undefined' && browser?.runtime?.getURL
        ? browser.runtime.getURL(`/canvas.html?id=${id}`)
        : `/canvas.html?id=${id}`;

    if (typeof browser !== 'undefined' && browser?.tabs?.create) {
      browser.tabs.create({ url: canvasUrl, active: true });
    } else {
      window.open(canvasUrl, '_blank');
    }
  }, []);

  return {
    handleDownloadSingle,
    handleDownloadGroup,
    handleOpenCanvas,
  };
}
