import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { onMessage, sendMessage } from 'webext-bridge/content-script';
import {
  findVideoElement,
  prepareDRMHardenedUI,
  waitForNextFrames,
} from '../features/capture/drm-capture-engine';
import { sendCaptureToTactical } from '../features/capture/tactical-bridge';
import {
  calculateContainVideoCrop,
  cropCapturedImage,
} from '../features/capture/video-cropper';
import { OverlayApp, useOverlayStore } from '../features/memo-overlay';
import { setupFooticsAppBridge } from '../features/storage-sync/footics-app-bridge';
import '../assets/overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_start',

  async main(ctx) {
    console.log('💎 [Footics] Overlay Content Script Injected');

    // ── キャプチャパイプラインのハンドラ（即時同期登録） ──
    const executeCapture = async () => {
      console.log('📸 [Footics Capture] Capture trigger received');
      const video = findVideoElement();
      const cleanup = video ? prepareDRMHardenedUI(video).cleanup : () => {};

      try {
        if (video) {
          // GPU合成とスタイル適用が確実に完了するまで待機
          await waitForNextFrames(3);
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
                'image/webp',
              );
            } catch (cropErr) {
              console.warn(
                '⚠️ [Footics Capture] Auto crop failed, using original dataUrl:',
                cropErr,
              );
            }
          }

          console.log(
            '✅ [Footics Capture] Frame captured & cropped successfully:',
            { dataLength: finalDataUrl.length },
          );

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
            useOverlayStore.getState().setToast('🎨 Quick Canvasを開きました');
          }
        } else {
          console.error(
            '❌ [Footics Capture] Tab capture returned no data:',
            res?.error,
          );
        }
      } catch (err) {
        console.error('❌ [Footics Capture] Capture execution failed:', err);
      } finally {
        cleanup();
      }
    };

    onMessage('TRIGGER_CAPTURE', executeCapture);
    window.addEventListener('footics-trigger-capture', executeCapture);

    const nativeMessageListener = (message: any) => {
      if (message?.type === 'TRIGGER_CAPTURE') {
        executeCapture();
      }
    };
    if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
      browser.runtime.onMessage.addListener(nativeMessageListener);
    }

    // Footics Web App 向けの通信・同期ブリッジを初期化
    try {
      setupFooticsAppBridge();
    } catch (bridgeErr) {
      console.warn('[Footics] App bridge init skipped/failed:', bridgeErr);
    }

    // UI マウント処理（body が存在しない場合は DOMContentLoaded を待機）
    const mountUiWhenReady = async () => {
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', mountUiWhenReady, {
          once: true,
        });
        return;
      }

      try {
        const ui = await createShadowRootUi(ctx, {
          name: 'footics-memo-overlay',
          position: 'inline',
          anchor: 'body',
          append: 'last',
          onMount: (container) => {
            const root = createRoot(container);
            root.render(<OverlayApp />);
            return root;
          },
          onRemove: (root: Root | undefined) => {
            root?.unmount();
          },
        });

        ui.mount();

        // ── Fullscreen (Top Layer) 追従 ──
        const handleFullscreenChange = () => {
          const targetHost = document.fullscreenElement || document.body;
          if (ui.shadowHost && ui.shadowHost.parentElement !== targetHost) {
            console.log(
              '[Footics Overlay] Relocating overlay shadowHost to fullscreen target:',
              targetHost,
            );
            targetHost.appendChild(ui.shadowHost);
          }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        ctx.onInvalidated(() => {
          document.removeEventListener(
            'fullscreenchange',
            handleFullscreenChange,
          );
        });
      } catch (uiErr) {
        console.warn('[Footics Overlay] UI mount deferred or failed:', uiErr);
      }
    };

    mountUiWhenReady();

    ctx.onInvalidated(() => {
      window.removeEventListener('footics-trigger-capture', executeCapture);
      if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
        browser.runtime.onMessage.removeListener(nativeMessageListener);
      }
    });
  },
});
