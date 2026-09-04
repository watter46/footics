import ReactDOM from 'react-dom/client';
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
import '../assets/overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('💎 [Footics] Overlay Content Script Injected');

    const ui = await createShadowRootUi(ctx, {
      name: 'footics-memo-overlay',
      position: 'inline',
      anchor: 'body',
      append: 'last',
      onMount: (container) => {
        const root = ReactDOM.createRoot(container);
        root.render(<OverlayApp />);
        return root;
      },
      onRemove: (root: ReactDOM.Root | undefined) => {
        root?.unmount();
      },
    });

    ui.mount();

    // ── Fullscreen (Top Layer) 追従 ──
    // DAZNやYouTube等で動画が全画面表示された際、Top Layerにオーバーレイを移動して不可視化を防ぐ
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
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    // ── キャプチャパイプラインのハンドラ ──
    onMessage('TRIGGER_CAPTURE', async () => {
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

          // Tactical 画面への直接転送パイプラインを実行
          const bridgeResult = await sendCaptureToTactical(finalDataUrl, {
            sourceUrl: window.location.href,
            title: document.title,
          });

          if (bridgeResult.success) {
            useOverlayStore
              .getState()
              .setToast('🎯 Tactical画面へ転送しました');
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
    });
  },
});
