import { browser } from 'wxt/browser';
import ReactDOM from 'react-dom/client';
import React, { useState, useEffect, useRef } from 'react';
import { MemoOverlayBridge } from '../features/MemoOverlay/MemoOverlayBridge';
import '../assets/overlay.css';

export default defineContentScript({
  // すべての主要動画サイトに加え、開発時テスト用に localhost を含めます。
  matches: [
    '*://*.dazn.com/*',
    '*://*.unext.jp/*',
    '*://video.unext.jp/*',
    '*://localhost/*',
    '*://127.0.0.1/*',
    '*://www.youtube.com/*'
  ],
  cssInjectionMode: 'ui',

  async main(ctx) {
    console.log('💎 [Footics] Overlay Content Script Injected on:', window.location.href);

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

/**
 * OverlayApp
 * 責務: ページへの注入管理・可視性制御・キーボードハイジャック。
 * 保存ロジック・状態管理は MemoOverlayBridge へ委譲する。
 */
const OverlayApp = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [mode, setMode] = useState<'MATCH' | 'EVENT'>('MATCH');
  const [matchId, setMatchId] = useState<string | undefined>();
  const [initialError, setInitialError] = useState<string | undefined>();

  // メッセージリスナー & ハイジャック用に最新状態をRefで保持
  const stateRef = useRef({ isVisible, mode });
  useEffect(() => {
    stateRef.current = { isVisible, mode };
  }, [isVisible, mode]);

  useEffect(() => {
    // ── 1. Background からのメッセージを受信してオーバーレイを開く ──
    const listener = (message: any) => {
      if (message.type !== 'OPEN_OVERLAY') return;
      const { isVisible: currentVisible, mode: currentMode } = stateRef.current;
      // 同モードで既に開いていればトグル
      if (currentVisible && currentMode === message.mode) {
        setIsVisible(false);
        return;
      }
      setMode(message.mode || 'MATCH');
      setMatchId(message.matchId);
      setInitialError(message.error);
      setIsVisible(true);
    };
    browser.runtime.onMessage.addListener(listener);

    // ── 2. キーボード・ハイジャック (オーバーレイ表示中にキーをインターセプト) ──
    const handleCaptureKey = (e: KeyboardEvent) => {
      if (!stateRef.current.isVisible) return;

      const hijackedKeys = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Tab', 'Escape', 'Enter', ' ', 'Backspace',
        '1', '2', '3', '4', '5', '6',
      ];

      const isSaveCombo = e.key === 'Enter' && (e.ctrlKey || e.metaKey);
      if (!hijackedKeys.includes(e.key) && !isSaveCombo) return;

      e.stopImmediatePropagation();
      e.preventDefault();

      let action = '';
      const detail: Record<string, unknown> = {
        key: e.key, code: e.code, shiftKey: e.shiftKey, ctrlKey: e.ctrlKey, metaKey: e.metaKey,
      };

      if (e.key === 'Backspace')              action = 'BACKSPACE';
      else if (isSaveCombo)                   action = 'SAVE_MEMO';
      else if (e.key === 'Enter')             action = 'NEXT_PHASE';
      else if (e.key === 'Escape')            action = 'CLOSE_OVERLAY';
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') action = 'NAVIGATE_SUGGESTION';
      else if (['1','2','3','4','5','6'].includes(e.key)) {
        action = 'FILTER_CATEGORY';
        detail.categoryIndex = parseInt(e.key) - 1;
      } else if (e.key === 'Tab') {
        action = e.shiftKey ? 'PREV_PHASE' : 'NEXT_PHASE';
      }

      if (action) {
        window.dispatchEvent(new CustomEvent('footics-action', { detail: { action, ...detail } }));
      }
    };
    window.addEventListener('keydown', handleCaptureKey, { capture: true });

    return () => {
      browser.runtime.onMessage.removeListener(listener);
      window.removeEventListener('keydown', handleCaptureKey, { capture: true });
    };
  }, []);

  // ── 保存成功時のトースト表示 ──
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

      {/* Main Overlay - MemoOverlayBridge がすべての保存ロジックを担う */}
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
