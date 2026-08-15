import { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { onMessage } from 'webext-bridge/content-script';
import { SuccessToast } from '../components/ui/SuccessToast';
import { MemoOverlayBridge } from '../features/memo-overlay/memo-overlay-bridge';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { useOverlayStore } from '../stores/useOverlayStore';
import { cn } from '../utils/cn';
import { findVideoElement } from '../utils/video';
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
