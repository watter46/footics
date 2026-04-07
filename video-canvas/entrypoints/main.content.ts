import { browser } from 'wxt/browser';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    browser.runtime.onMessage.addListener((message: any) => {
      if (message.type === 'VIDEO_CANVAS_CAPTURE_TRIGGER') {
        captureVideo();
      }
    });

    async function captureVideo() {
      const video = document.querySelector('video');
      if (!video) return;

      const isDrmSite = /unext\.jp|dazn\.com/.test(window.location.hostname);
      const originalRect = video.getBoundingClientRect();

      // 1. DRMサイト以外での高速キャプチャ試行
      if (!isDrmSite) {
        const success = await tryDirectCanvasCapture(video);
        if (success) return;
      }

      // 2. Viewport キャプチャ (DRM回避・UI完全排除モード)
      const { cleanup } = prepareUIForCapture(video);
      
      try {
        await new Promise(r => setTimeout(r, 250));

        const response = await browser.runtime.sendMessage({
          type: 'VIDEO_CANVAS_REQUEST_TAB_CAPTURE'
        }) as any;

        if (response?.success) {
          await browser.runtime.sendMessage({
            type: 'VIDEO_CANVAS_CAPTURE_RESULT',
            dataUrl: response.dataUrl,
            rect: {
              x: 0, y: 0,
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
                height: originalRect.height
              }
            },
            isDirectCapture: false
          });
        }
      } finally {
        cleanup();
      }
    }

    /**
     * Canvas.drawImage を使用した直接キャプチャ。成功した場合は true を返す。
     */
    async function tryDirectCanvasCapture(video: HTMLVideoElement): Promise<boolean> {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const pixel = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
        const isBlack = pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0;

        if (!isBlack) {
          await browser.runtime.sendMessage({
            type: 'VIDEO_CANVAS_CAPTURE_RESULT',
            dataUrl: canvas.toDataURL('image/png'),
            isDirectCapture: true
          });
          return true;
        }
      } catch (e) {
        console.warn('[Video Canvas] Direct capture failed:', e);
      }
      return false;
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
          filter: brightness(1.001) !important;
          opacity: 0.999 !important;
          transform: translateZ(0) !important;
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
          parents.forEach(p => (p.style.visibility = ''));
        }
      };
    }
  },
});