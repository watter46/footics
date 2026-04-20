import { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import { SuccessToast } from '../components/ui/SuccessToast';
import { MemoOverlayBridge } from '../features/MemoOverlay/MemoOverlayBridge';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import { useOverlayStore } from '../stores/useOverlayStore';
import { ExtensionMessageSchema } from '../types/schemas';
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
  const {
    isVisible,
    toast,
    mode,
    matchId,
    initialError,
    open,
    close,
    setToast,
  } = useOverlayStore();

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor();

  useEffect(() => {
    // Background からのメッセージを受信
    const listener = (rawMessage: unknown) => {
      const result = ExtensionMessageSchema.safeParse(rawMessage);
      if (!result.success) return;

      const message = result.data;
      if (message.type !== 'OPEN_OVERLAY') return;

      // 同モードで既に開いていればトグルで閉じる
      if (isVisible && mode === message.mode) {
        close();
      } else {
        open({
          mode: message.mode,
          matchId: message.matchId,
          error: message.error,
        });
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
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
