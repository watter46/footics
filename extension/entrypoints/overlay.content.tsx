import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { onMessage, sendMessage } from 'webext-bridge/content-script';
import { SuccessToast } from '../components/ui/SuccessToast';
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
import { MemoOverlayBridge } from '../features/memo-overlay/memo-overlay-bridge';

import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { useOverlayStore } from '../stores/useOverlayStore';
import { cn } from '../utils/cn';
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
                'image/png',
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

const OverlayApp = () => {
  const { isVisible, toast, mode, open, close } = useOverlayStore();
  const activeElementRef = useRef<HTMLElement | null>(null);

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor();

  useEffect(() => {
    // Background からのメッセージを受信
    return onMessage('OPEN_OVERLAY', ({ data }) => {
      // 同モードで既に開いていればトグルで閉じる
      if (isVisible && mode === data.mode) {
        close();
      } else {
        // 開く直前に、現在フォーカスされている要素を記憶
        if (
          document.activeElement &&
          document.activeElement !== document.body
        ) {
          activeElementRef.current = document.activeElement as HTMLElement;
          console.log(
            '[Footics Overlay] Captured active element before open:',
            activeElementRef.current,
          );
        } else {
          activeElementRef.current = null;
        }

        open({
          mode: data.mode,
          matchId: data.matchId,
          error: data.error,
          initialData: data.initialData,
        });
      }
    });
  }, [isVisible, mode, open, close]);

  // 閉じたときのフォーカス復元を処理する useEffect
  useEffect(() => {
    if (!isVisible) {
      // 閉じたとき、記憶していた要素にフォーカスを戻す
      if (activeElementRef.current) {
        console.log(
          '[Footics Overlay] Restoring focus to:',
          activeElementRef.current,
        );
        activeElementRef.current.focus();
        activeElementRef.current = null;
      } else {
        // フォールバック：Shadow DOMを含むページ内の video 要素を探してフォーカス
        const video = findVideoElement();
        if (video) {
          console.log(
            '[Footics Overlay] Fallback: Focusing found video element',
          );
          video.focus();
        }
      }
    }
  }, [isVisible]);

  return (
    <div className={cn('footics-overlay-host')}>
      <SuccessToast message={toast.message} isVisible={toast.visible} />

      {/* Main Overlay */}
      {isVisible && (
        <div className={cn('footics-overlay-root')}>
          <MemoOverlayBridge />
        </div>
      )}
    </div>
  );
};
