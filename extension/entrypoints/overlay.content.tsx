import { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { browser } from 'wxt/browser';
import { SuccessToast } from '../components/ui/SuccessToast';
import { OVERLAY_TRANSITION_DURATION } from '../constants';
import { MemoOverlayBridge } from '../features/MemoOverlay/MemoOverlayBridge';
import { useOverlayShortcutInterceptor } from '../hooks/use-overlay-shortcut-interceptor';
import type { ExtensionMessage } from '../types/messaging';
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
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  });
  const [mode, setMode] = useState<'MATCH' | 'EVENT'>('MATCH');
  const [matchId, setMatchId] = useState<string | undefined>();
  const [initialError, setInitialError] = useState<string | undefined>();

  // キーボード入力をキャプチャして footics-action に変換するロジックを分離
  useOverlayShortcutInterceptor({ isVisible });

  useEffect(() => {
    // Background からのメッセージを受信
    const listener = (message: ExtensionMessage) => {
      if (message.type !== 'OPEN_OVERLAY') return;

      // 同モードで既に開いていればトグルで閉じる
      setIsVisible((prev) => {
        if (prev && mode === message.mode) return false;

        setMode(message.mode || 'MATCH');
        setMatchId(message.matchId);
        setInitialError(message.error);
        return true;
      });
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [mode]);

  const handleSaveSuccess = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(
      () => setToast((prev) => ({ ...prev, visible: false })),
      OVERLAY_TRANSITION_DURATION,
    );
  };

  const handleClose = () => setIsVisible(false);

  return (
    <div className="footics-overlay-host">
      <SuccessToast message={toast.message} isVisible={toast.visible} />

      {/* Main Overlay */}
      {isVisible && (
        <div className="footics-overlay-root">
          <MemoOverlayBridge
            mode={mode}
            matchId={matchId}
            initialError={initialError}
            onClose={handleClose}
            onSaveSuccess={handleSaveSuccess}
          />
        </div>
      )}
    </div>
  );
};
