import { browser } from 'wxt/browser';
import ReactDOM from 'react-dom/client';
import React, { useState, useEffect } from 'react';
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
    '*://footics.watool.workers.dev/*'
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
      onRemove: (root: any) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});

const OverlayApp = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
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
      setIsVisible(prev => {
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
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 3000);
  };

  const handleClose = () => setIsVisible(false);

  return (
    <div className="footics-overlay-host">
      {/* Success Toast */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-[2147483647] flex items-center gap-3 bg-slate-900 border border-emerald-500/30 px-4 py-3 rounded-lg shadow-2xl animate-in slide-in-from-right-4 fade-in duration-300">
          <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-xs font-black text-slate-100 uppercase tracking-tighter">{toast.message}</p>
        </div>
      )}

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
