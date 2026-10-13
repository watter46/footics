import {
  type CapturedScreenshot,
  purgeOldScreenshots,
  saveCapturedScreenshot,
} from './db/screenshot-db';

export interface ProcessCaptureParams {
  imageDataUrl: string;
  videoUrl?: string;
  videoTitle?: string;
  videoTime?: number;
  thumbnailDataUrl?: string;
}

export interface ProcessCaptureResult {
  id: string;
  tabId?: number;
}

/**
 * キャプチャ完了処理パイプライン
 * 1. DB にスクリーンショットを永続化
 * 2. 古いスクリーンショットの自動パージ（非同期クリーンアップ）
 * 3. canvas.html?id=[id] を新規タブで開く
 */
export async function processAndOpenCanvas(
  params: ProcessCaptureParams,
): Promise<ProcessCaptureResult> {
  const id = `shot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  const screenshot: CapturedScreenshot = {
    id,
    timestamp: Date.now(),
    videoUrl: params.videoUrl || '',
    videoTitle: params.videoTitle || 'Captured Frame',
    videoTime: params.videoTime ?? 0,
    imageDataUrl: params.imageDataUrl,
    thumbnailDataUrl: params.thumbnailDataUrl,
    isFavorite: false,
    syncedToFootics: false,
  };

  await saveCapturedScreenshot(screenshot);

  // 非同期でクリーンアップを実行（メイン処理をブロックしない）
  purgeOldScreenshots().catch((err) => {
    console.warn('[CapturePipeline] Background purge failed:', err);
  });

  // canvas.html を開く
  let tabId: number | undefined;
  if (
    typeof browser !== 'undefined' &&
    browser?.runtime?.getURL &&
    browser?.tabs?.create
  ) {
    const canvasUrl = browser.runtime.getURL(`/canvas.html?id=${id}`);
    const tab = await browser.tabs.create({
      url: canvasUrl,
      active: true,
    });
    tabId = tab.id;
  }

  return { id, tabId };
}
