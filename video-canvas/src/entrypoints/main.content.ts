import { browser } from 'wxt/browser';
import {
  type CaptureResultMessage,
  MessageTypes,
  type RequestTabCaptureMessage,
} from '../lib/message-types';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === MessageTypes.CAPTURE_TRIGGER) {
        captureVideo();
      }
    });

    /**
     * DOMツリー（Shadow DOM含む）からビデオ要素を再帰的に検索する
     */
    function findVideoElement(
      root: Document | ShadowRoot | Element = document,
    ): HTMLVideoElement | null {
      const video = root.querySelector('video');
      if (video) return video;

      // Shadow DOMを持つ要素を検索
      const shadowHosts = root.querySelectorAll('*');
      for (const host of Array.from(shadowHosts)) {
        if (host.shadowRoot) {
          const v = findVideoElement(host.shadowRoot);
          if (v) return v;
        }
      }
      return null;
    }

    async function captureVideo() {
      const video = findVideoElement();
      if (!video) {
        console.warn('[Video Canvas] No video element found.');
        return;
      }

      const originalRect = video.getBoundingClientRect();

      // Viewport キャプチャ (全サイト共通・DRM回避・UI完全排除モード)
      const { cleanup } = prepareUIForCapture(video);

      try {
        // スタイル適用待ち
        await new Promise((r) => setTimeout(r, 250));

        const requestMessage: RequestTabCaptureMessage = {
          type: MessageTypes.REQUEST_TAB_CAPTURE,
        };
        const response = (await browser.runtime.sendMessage(
          requestMessage,
        )) as any;

        if (response?.success) {
          const resultMessage: CaptureResultMessage = {
            type: MessageTypes.CAPTURE_RESULT,
            dataUrl: response.dataUrl,
            rect: {
              x: 0,
              y: 0,
              width: window.innerWidth,
              height: window.innerHeight,
              devicePixelRatio: window.devicePixelRatio,
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
              originalVideoRect: {
                x: originalRect.x,
                y: originalRect.y,
                width: originalRect.width,
                height: originalRect.height,
              },
            },
            isDirectCapture: false,
          };
          await browser.runtime.sendMessage(resultMessage);
        }
      } finally {
        cleanup();
      }
    }

    /**
     * キャプチャのためにUIを隠し、ビデオを全画面に固定する。クリーンアップ用関数を返す。
     */
    function prepareUIForCapture(video: HTMLVideoElement) {
      const styleId = 'video-canvas-capture-hide-ui';
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        * { visibility: hidden !important; }
        video, video * { 
          visibility: visible !important; 
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
          object-fit: contain !important;
          background: black !important;
          /* DRM回避のためのGPU合成強制トリック */
          filter: brightness(1.001) !important;
          opacity: 0.999 !important;
          transform: translateZ(0) !important;
          will-change: transform, opacity, filter !important;
          backface-visibility: hidden !important;
        }
        video *:not(video) { position: absolute !important; }
      `;

      const parents: HTMLElement[] = [];
      let parent = video.parentElement;
      while (parent) {
        parents.push(parent);
        parent.style.visibility = 'visible';
        parent = parent.parentElement;
      }
      document.head.appendChild(style);

      return {
        cleanup: () => {
          style.remove();
          parents.forEach((p) => {
            p.style.visibility = '';
          });
        },
      };
    }
  },
});
