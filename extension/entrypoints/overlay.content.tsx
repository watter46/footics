import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { onMessage } from 'webext-bridge/content-script';
import { CaptureService } from '../features/capture/services/capture-service';
import { OverlayApp } from '../features/memo-overlay';
import { setupFooticsAppBridge } from '../features/storage-sync/footics-app-bridge';
import '../assets/overlay.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  runAt: 'document_start',

  async main(ctx) {
    // ── キャプチャパイプラインのハンドラ（即時同期登録） ──
    const handleCaptureTrigger = () => {
      CaptureService.executeCapturePipeline();
    };

    const handleWindowMessage = (e: MessageEvent) => {
      if (e.data?.type === 'FOOTICS_TRIGGER_CAPTURE') {
        CaptureService.executeCapturePipeline();
      }
    };
    window.addEventListener('message', handleWindowMessage);

    onMessage('TRIGGER_CAPTURE', async () => {
      await CaptureService.executeCapturePipeline();
    });
    window.addEventListener('footics-trigger-capture', handleCaptureTrigger);

    const nativeMessageListener = (message: any) => {
      if (message?.type === 'TRIGGER_CAPTURE') {
        CaptureService.executeCapturePipeline();
      }
    };
    if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
      browser.runtime.onMessage.addListener(nativeMessageListener);
    }

    // Footics Web App 向けの通信・同期ブリッジを初期化
    let cleanupBridge: (() => void) | undefined;
    try {
      cleanupBridge = setupFooticsAppBridge();
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
      cleanupBridge?.();
      window.removeEventListener('message', handleWindowMessage);
      window.removeEventListener(
        'footics-trigger-capture',
        handleCaptureTrigger,
      );
      if (typeof browser !== 'undefined' && browser.runtime?.onMessage) {
        browser.runtime.onMessage.removeListener(nativeMessageListener);
      }
    });
  },
});
