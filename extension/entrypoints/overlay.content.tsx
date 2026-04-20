import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { onMessage } from 'webext-bridge/content-script';
import { SuccessToast } from '../components/ui/SuccessToast';
import { MemoOverlayBridge } from '../features/MemoOverlay/MemoOverlayBridge';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { useOverlayStore } from '../stores/useOverlayStore';
import { cn } from '../utils/cn';
import '../assets/overlay.css';

export default defineContentScript({
  matches: [
    '*://*.dazn.com/*',
    '*://*.unext.jp/*',
    '*://video.unext.jp/*',
    '*://localhost/*',
    '*://127.0.0.1/*',
    '*://www.youtube.com/*',
    '*://footics.watool.workers.dev/*',
  ],
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
  },
});

const OverlayApp = () => {
  const { isVisible, toast, mode, open, close } = useOverlayStore();

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor();

  useEffect(() => {
    // Background からのメッセージを受信
    return onMessage('OPEN_OVERLAY', ({ data }) => {
      // 同モードで既に開いていればトグルで閉じる
      if (isVisible && mode === data.mode) {
        close();
      } else {
        open({
          mode: data.mode,
          matchId: data.matchId,
          error: data.error,
        });
      }
    });
  }, [isVisible, mode, open, close]);

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
