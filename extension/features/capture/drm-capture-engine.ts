export interface VideoElementCaptureResult {
  video: HTMLVideoElement;
  videoRect: DOMRect;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  videoWidth: number;
  videoHeight: number;
}

export interface DRMStyleCleanup {
  cleanup: () => void;
}

/**
 * DOMツリー（Shadow DOM含む）からビデオ要素を再帰的に探索する
 */
export function findVideoElement(
  root: Document | ShadowRoot | Element = document,
): HTMLVideoElement | null {
  const video = root.querySelector('video');
  if (video) return video;

  // Shadow DOMを持つ要素を再帰的に検索
  const shadowHosts = root.querySelectorAll('*');
  for (const host of Array.from(shadowHosts)) {
    if (host.shadowRoot) {
      const v = findVideoElement(host.shadowRoot);
      if (v) return v;
    }
  }
  return null;
}

/**
 * UIの非表示とDRM動画のGPU合成強制レイヤーを適用する。
 * レンダリングのチラつきを防ぎつつ、キャプチャ時に黒画面化するDRM保護を回避する。
 */
export function prepareDRMHardenedUI(video: HTMLVideoElement): DRMStyleCleanup {
  const styleId = 'footics-hardened-drm-capture-style';
  const existing = document.getElementById(styleId);
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.id = styleId;
  // 多層GPU合成レイヤー・DRMバイパスCSS
  // - brightness / contrast / opacity / transform の微細変化によるDirect Composition回避
  // - 全DOMの非表示と動画親要素の可視化
  style.textContent = `
    html, body {
      overflow: hidden !important;
      scrollbar-width: none !important;
    }
    ::-webkit-scrollbar {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    * { 
      visibility: hidden !important; 
    }
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
      
      /* DRM回避のためのGPUコンポジター強制フォールバック多層トリック */
      filter: brightness(1.001) contrast(1.0005) !important;
      opacity: 0.9999 !important;
      transform: translate3d(0, 0, 0) scale(1.0001) !important;
      will-change: transform, opacity, filter !important;
      backface-visibility: hidden !important;
      perspective: 1000px !important;
    }
    video *:not(video) { 
      position: absolute !important; 
    }
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

/**
 * requestAnimationFrame を2フレーム分待機し、スタイル適用とGPU合成が完了するのを保証する
 */
export async function waitForNextFrames(frames = 2): Promise<void> {
  return new Promise((resolve) => {
    let count = 0;
    const step = () => {
      count++;
      if (count >= frames) {
        resolve();
      } else {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  });
}
