import { sendMessage } from 'webext-bridge/content-script';
import { useOverlayStore } from '~/features/memo-overlay';
import {
  findVideoElement,
  prepareDRMHardenedUI,
  waitForNextFrames,
} from '../drm-capture-engine';
import { calculateContainVideoCrop, cropCapturedImage } from '../video-cropper';

export interface CaptureOptions {
  /** クロップ画像のフォーマット (既定: 'image/webp') */
  cropFormat?: 'image/webp' | 'image/png';
  /** DRM UI 適用後の待機フレーム数 (既定: 3) */
  waitFrames?: number;
  /** 対象ビデオ要素（指定がない場合は DOM から自動検出） */
  videoElement?: HTMLVideoElement | null;
  /** トースト通知を無効化するかどうか */
  disableToast?: boolean;
}

/**
 * 動画キャプチャパイプラインを実行するファサードサービス
 *
 * 1. 動画要素の探索と DRM UI 保護スタイルの適用
 * 2. GPU レンダリング同期待機
 * 3. バックグラウンドへのタブキャプチャ要求
 * 4. レターボックス自動検出・クロップ処理
 * 5. バックグラウンドへの保存＆Quick Canvas オープン要求
 * 6. 成功通知トーストの表示
 */
export async function executeCapturePipeline(
  options?: CaptureOptions,
): Promise<boolean> {
  const video =
    options?.videoElement !== undefined
      ? options.videoElement
      : findVideoElement();
  const cleanup = video ? prepareDRMHardenedUI(video).cleanup : () => {};

  try {
    if (video) {
      // GPU合成とスタイル適用が確実に完了するまで待機
      await waitForNextFrames(options?.waitFrames ?? 3);
    }

    const res = await sendMessage('REQUEST_TAB_CAPTURE', {}, 'background');
    if (res?.success && res.dataUrl) {
      let finalDataUrl = res.dataUrl;

      if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        const cropRect = calculateContainVideoCrop({
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        });

        try {
          finalDataUrl = await cropCapturedImage(
            res.dataUrl,
            cropRect,
            options?.cropFormat ?? 'image/webp',
          );
        } catch (cropErr) {
          console.warn(
            '⚠️ [Footics Capture] Auto crop failed, using original dataUrl:',
            cropErr,
          );
        }
      }

      // Quick Canvas パイプラインを実行
      const canvasResult = await sendMessage(
        'SAVE_AND_OPEN_CANVAS',
        {
          imageDataUrl: finalDataUrl,
          videoUrl: window.location.href,
          videoTitle: document.title,
          videoTime: video ? Math.floor(video.currentTime) : 0,
        },
        'background',
      );

      if (canvasResult?.success) {
        if (!options?.disableToast) {
          useOverlayStore.getState().setToast('🎨 Quick Canvasを開きました');
        }
        return true;
      }

      console.error(
        '❌ [Footics Capture] Save & open canvas failed:',
        canvasResult?.error,
      );
      return false;
    }

    console.error(
      '❌ [Footics Capture] Tab capture returned no data:',
      res?.error,
    );
    return false;
  } catch (err) {
    console.error('❌ [Footics Capture] Capture execution failed:', err);
    return false;
  } finally {
    cleanup();
  }
}

export const CaptureService = {
  executeCapturePipeline,
};
