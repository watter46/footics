import { LayoutDashboard } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  UnifiedCanvas,
  useStandaloneCanvasSession,
} from '@/features/tactical-unified';
import {
  type CapturedScreenshot,
  getScreenshotById,
  toggleFavorite,
  updateScreenshot,
} from '../../capture/db/screenshot-db';
import { QuickCanvasTopBar } from './QuickCanvasTopBar';

export const QuickTacticalCanvas: React.FC = () => {
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Fetch screenshot metadata and image data from IndexedDB
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      setError('スクリーンショットIDが指定されていません');
      setLoading(false);
      return;
    }

    getScreenshotById(id)
      .then((data) => {
        if (!data) {
          setError('スクリーンショットが見つかりませんでした');
          setLoading(false);
          return;
        }
        setScreenshot(data);
        setIsFavorite(data.isFavorite ?? false);
        setLoading(false);
      })
      .catch((err) => {
        setError(`データ取得エラー: ${err.message}`);
        setLoading(false);
      });
  }, []);

  // Initialize Footics Tactical session for Extension
  const { undo, redo, canUndo, canRedo } = useStandaloneCanvasSession({
    imageDataUrl: screenshot?.imageDataUrl,
    initialAnnotations: screenshot?.canvasAnnotations,
    onSaveAnnotations: async (annotationsJson) => {
      if (!screenshot?.id) return;
      try {
        await updateScreenshot(screenshot.id, {
          canvasAnnotations: annotationsJson,
        });
      } catch (err) {
        console.warn('[QuickTacticalCanvas] Auto-save failed:', err);
      }
    },
    debounceMs: 500,
  });

  // Global Keyboard shortcuts: Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (canRedo) redo();
        } else {
          e.preventDefault();
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleToggleFavorite = async () => {
    if (!screenshot) return;
    try {
      const nextFav = await toggleFavorite(screenshot.id);
      setIsFavorite(nextFav);
      showToast(
        nextFav ? '⭐ お気に入りに追加しました' : 'お気に入りを解除しました',
      );
    } catch (err) {
      console.warn('Favorite toggle error:', err);
    }
  };

  const handleCopyClipboard = () => {
    window.dispatchEvent(new CustomEvent('tactical:copy-png'));
    showToast('📋 画像をクリップボードにコピーしました！');
  };

  const handleDownload = () => {
    window.dispatchEvent(
      new CustomEvent('tactical:export', {
        detail: { format: 'png', scope: 'current', scale: 2 },
      }),
    );
    showToast('💾 画像を保存しました');
  };

  const handleShareX = () => {
    handleCopyClipboard();
    const title = screenshot?.videoTitle || 'Footics Tactics Note';
    const text = encodeURIComponent(
      `⚽ 戦術分析メモ [${title}] #Footics #Tactics`,
    );
    const xUrl = `https://twitter.com/intent/tweet?text=${text}`;

    if (typeof browser !== 'undefined' && browser.tabs?.create) {
      browser.tabs.create({ url: xUrl, active: true });
    } else {
      window.open(xUrl, '_blank');
    }

    showToast(
      '🚀 Xを開きました！クリップボードの画像を Ctrl+V で貼り付けてください',
    );
  };

  const handleOpenDashboard = () => {
    if (
      typeof browser !== 'undefined' &&
      browser.runtime?.getURL &&
      browser.tabs?.create
    ) {
      browser.tabs.create({
        url: browser.runtime.getURL('/dashboard.html'),
        active: true,
      });
    } else {
      window.location.href = 'dashboard.html';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-300">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
        <span>キャンバスを読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-zinc-300 p-6">
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl max-w-md text-center">
          <p className="font-semibold text-lg mb-2">エラー</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          type="button"
          onClick={handleOpenDashboard}
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm flex items-center gap-2 cursor-pointer"
        >
          <LayoutDashboard className="w-4 h-4" />
          ダッシュボードへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      <QuickCanvasTopBar
        screenshot={screenshot}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        onCopyClipboard={handleCopyClipboard}
        onDownload={handleDownload}
        onShareX={handleShareX}
        onOpenDashboard={handleOpenDashboard}
      />

      <main className="relative flex-1 w-full h-[calc(100vh-2.75rem)] overflow-hidden">
        <UnifiedCanvas markerMode="3d-only" />
      </main>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/95 text-white border border-zinc-700/80 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur text-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
