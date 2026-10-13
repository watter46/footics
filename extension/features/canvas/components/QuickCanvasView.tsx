import {
  ArrowUpRight,
  Check,
  Circle,
  Copy,
  Download,
  LayoutDashboard,
  Minus,
  Pencil,
  Redo2,
  Share2,
  Square,
  Star,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type CapturedScreenshot,
  getScreenshotById,
  toggleFavorite,
  updateScreenshot,
} from '../../capture/db/screenshot-db';
import {
  type CanvasShape,
  createCanvasHistory,
  type Point,
  type ShapeType,
} from '../utils/canvas-history';
import { renderCanvasShapes } from '../utils/canvas-renderer';

const COLORS = [
  { label: 'Red', value: '#EF4444' },
  { label: 'Yellow', value: '#EAB308' },
  { label: 'Blue', value: '#3B82F6' },
  { label: 'Green', value: '#22C55E' },
  { label: 'White', value: '#FFFFFF' },
  { label: 'Black', value: '#18181B' },
];

const STROKE_WIDTHS = [
  { label: 'Thin', value: 2 },
  { label: 'Medium', value: 4 },
  { label: 'Thick', value: 8 },
];

export const QuickCanvasView: React.FC = () => {
  const [screenshot, setScreenshot] = useState<CapturedScreenshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tool states
  const [activeTool, setActiveTool] = useState<ShapeType>('pen');
  const [activeColor, setActiveColor] = useState<string>('#EF4444');
  const [activeStrokeWidth, setActiveStrokeWidth] = useState<number>(4);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);

  // History manager ref
  const historyRef = useRef(createCanvasHistory());
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Point>({ x: 0, y: 0 });
  const currentPointsRef = useRef<Point[]>([]);

  // Show Toast
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  // Sync undo/redo availability
  const updateHistoryState = useCallback(() => {
    setCanUndo(historyRef.current.canUndo());
    setCanRedo(historyRef.current.canRedo());
  }, []);

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background image
    if (bgImageRef.current) {
      ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
    }

    // Draw persisted shapes
    const shapes = historyRef.current.getShapes();
    renderCanvasShapes(ctx, shapes);
  }, []);

  // Save annotations to DB
  const saveToDb = useCallback(
    async (shapes: CanvasShape[]) => {
      if (!screenshot) return;
      try {
        await updateScreenshot(screenshot.id, {
          canvasAnnotations: JSON.stringify(shapes),
        });
      } catch (err) {
        console.warn('[QuickCanvas] Failed to auto-save annotations:', err);
      }
    },
    [screenshot],
  );

  // Initial load
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

        // Load existing annotations
        if (data.canvasAnnotations) {
          try {
            const parsed = JSON.parse(data.canvasAnnotations);
            if (Array.isArray(parsed)) {
              historyRef.current.setInitialShapes(parsed);
              updateHistoryState();
            }
          } catch {}
        }

        // Load background image
        const img = new Image();
        img.onload = () => {
          bgImageRef.current = img;
          const canvas = canvasRef.current;
          if (canvas) {
            canvas.width = img.naturalWidth || 1280;
            canvas.height = img.naturalHeight || 720;
            redraw();
          }
          setLoading(false);
        };
        img.onerror = () => {
          setError('背景画像の読み込みに失敗しました');
          setLoading(false);
        };
        img.src = data.imageDataUrl;
      })
      .catch((err) => {
        setError(`データ取得エラー: ${err.message}`);
        setLoading(false);
      });
  }, [redraw, updateHistoryState]);

  // Handle Undo / Redo
  const handleUndo = useCallback(() => {
    historyRef.current.undo();
    updateHistoryState();
    redraw();
    saveToDb(historyRef.current.getShapes());
  }, [redraw, saveToDb, updateHistoryState]);

  const handleRedo = useCallback(() => {
    historyRef.current.redo();
    updateHistoryState();
    redraw();
    saveToDb(historyRef.current.getShapes());
  }, [redraw, saveToDb, updateHistoryState]);

  const handleClear = useCallback(() => {
    historyRef.current.clear();
    updateHistoryState();
    redraw();
    saveToDb(historyRef.current.getShapes());
    showToast('描画をクリアしました');
  }, [redraw, saveToDb, showToast, updateHistoryState]);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRedo, handleUndo]);

  // Canvas drawing event handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === 'text') {
      const pos = getCanvasCoords(e);
      const text = window.prompt('戦術メモを入力してください:');
      if (text?.trim()) {
        const textShape: CanvasShape = {
          type: 'text',
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          x: pos.x,
          y: pos.y,
          text: text.trim(),
          fontSize: activeStrokeWidth * 6 + 12,
        };
        historyRef.current.push(textShape);
        updateHistoryState();
        redraw();
        saveToDb(historyRef.current.getShapes());
      }
      return;
    }

    isDrawingRef.current = true;
    const pos = getCanvasCoords(e);
    startPointRef.current = pos;
    currentPointsRef.current = [pos];
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pos = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'pen') {
      currentPointsRef.current.push(pos);
      redraw();
      // Draw in-progress line
      ctx.save();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = activeStrokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentPointsRef.current[0].x, currentPointsRef.current[0].y);
      for (let i = 1; i < currentPointsRef.current.length; i++) {
        ctx.lineTo(
          currentPointsRef.current[i].x,
          currentPointsRef.current[i].y,
        );
      }
      ctx.stroke();
      ctx.restore();
    } else {
      // Preview shape
      redraw();
      const previewShape: CanvasShape =
        activeTool === 'arrow'
          ? {
              type: 'arrow',
              color: activeColor,
              strokeWidth: activeStrokeWidth,
              from: startPointRef.current,
              to: pos,
            }
          : activeTool === 'line'
            ? {
                type: 'line',
                color: activeColor,
                strokeWidth: activeStrokeWidth,
                from: startPointRef.current,
                to: pos,
              }
            : activeTool === 'rect'
              ? {
                  type: 'rect',
                  color: activeColor,
                  strokeWidth: activeStrokeWidth,
                  from: startPointRef.current,
                  to: pos,
                }
              : {
                  type: 'circle',
                  color: activeColor,
                  strokeWidth: activeStrokeWidth,
                  center: startPointRef.current,
                  radius: Math.hypot(
                    pos.x - startPointRef.current.x,
                    pos.y - startPointRef.current.y,
                  ),
                };
      renderCanvasShapes(ctx, [previewShape]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const pos = getCanvasCoords(e);

    let finishedShape: CanvasShape | null = null;
    if (activeTool === 'pen') {
      if (currentPointsRef.current.length > 0) {
        finishedShape = {
          type: 'pen',
          color: activeColor,
          strokeWidth: activeStrokeWidth,
          points: [...currentPointsRef.current],
        };
      }
    } else if (activeTool === 'arrow') {
      finishedShape = {
        type: 'arrow',
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        from: startPointRef.current,
        to: pos,
      };
    } else if (activeTool === 'line') {
      finishedShape = {
        type: 'line',
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        from: startPointRef.current,
        to: pos,
      };
    } else if (activeTool === 'rect') {
      finishedShape = {
        type: 'rect',
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        from: startPointRef.current,
        to: pos,
      };
    } else if (activeTool === 'circle') {
      finishedShape = {
        type: 'circle',
        color: activeColor,
        strokeWidth: activeStrokeWidth,
        center: startPointRef.current,
        radius: Math.hypot(
          pos.x - startPointRef.current.x,
          pos.y - startPointRef.current.y,
        ),
      };
    }

    if (finishedShape) {
      historyRef.current.push(finishedShape);
      updateHistoryState();
      redraw();
      saveToDb(historyRef.current.getShapes());
    }
  };

  // Export / Actions
  const handleCopyClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('クリップボードコピー用画像の生成に失敗しました');
          return;
        }
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('📋 画像をクリップボードにコピーしました！');
      }, 'image/png');
    } catch (err) {
      console.error('Clipboard copy error:', err);
      showToast('クリップボードへのアクセスに失敗しました');
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    const timeStr = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `footics-tactics-${timeStr}.png`;
    a.click();
    showToast('💾 画像をダウンロードしました');
  };

  const handleShareX = async () => {
    // 1. クリップボードへコピー
    await handleCopyClipboard();

    // 2. Xポスト用Web Intentを開く
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
          className="mt-4 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-sm flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" />
          ダッシュボードへ戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 select-none overflow-hidden font-sans">
      {/* Top Header & Action Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Pencil className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-200 truncate max-w-xs md:max-w-md">
              {screenshot?.videoTitle || 'Tactical Canvas'}
            </span>
            {screenshot?.videoUrl && (
              <a
                href={screenshot.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-zinc-400 hover:text-emerald-400 truncate max-w-xs"
              >
                {screenshot.videoUrl}
              </a>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleFavorite}
            title={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
            className={`p-2 rounded-lg border transition ${
              isFavorite
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={handleCopyClipboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium transition"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-300" />
            <span>コピー</span>
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5 text-zinc-300" />
            <span>保存</span>
          </button>

          <button
            type="button"
            onClick={handleShareX}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-400 rounded-lg text-xs font-medium transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Xで共有</span>
          </button>

          <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

          <button
            type="button"
            onClick={handleOpenDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>ダッシュボード</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Toolbar + Canvas) */}
      <div className="flex-1 flex relative overflow-hidden bg-zinc-950">
        {/* Floating / Left Toolbar */}
        <aside className="w-16 border-r border-zinc-800/80 bg-zinc-900/60 backdrop-blur flex flex-col items-center py-4 gap-4 shrink-0 z-10">
          {/* Drawing Tools */}
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              title="ペン (フリーハンド)"
              onClick={() => setActiveTool('pen')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'pen'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="矢印"
              onClick={() => setActiveTool('arrow')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'arrow'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="直線"
              onClick={() => setActiveTool('line')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'line'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="矩形 (四角形)"
              onClick={() => setActiveTool('rect')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'rect'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="サークル (円)"
              onClick={() => setActiveTool('circle')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'circle'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Circle className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="テキスト"
              onClick={() => setActiveTool('text')}
              className={`p-2.5 rounded-xl transition ${
                activeTool === 'text'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>
          </div>

          <div className="w-8 h-[1px] bg-zinc-800" />

          {/* Color Palette */}
          <div className="flex flex-col gap-2 items-center">
            {COLORS.map((c) => (
              <button
                type="button"
                key={c.value}
                title={c.label}
                onClick={() => setActiveColor(c.value)}
                className={`w-5 h-5 rounded-full border transition transform ${
                  activeColor === c.value
                    ? 'scale-125 border-emerald-400 shadow-md ring-2 ring-emerald-500/50'
                    : 'border-zinc-700 hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>

          <div className="w-8 h-[1px] bg-zinc-800" />

          {/* Stroke Width */}
          <div className="flex flex-col gap-2 items-center">
            {STROKE_WIDTHS.map((sw) => (
              <button
                type="button"
                key={sw.value}
                title={sw.label}
                onClick={() => setActiveStrokeWidth(sw.value)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                  activeStrokeWidth === sw.value
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: sw.value + 2, height: sw.value + 2 }}
                />
              </button>
            ))}
          </div>

          <div className="w-8 h-[1px] bg-zinc-800" />

          {/* History (Undo / Redo / Clear) */}
          <div className="flex flex-col gap-1.5 mt-auto">
            <button
              type="button"
              title="元に戻す (Ctrl+Z)"
              disabled={!canUndo}
              onClick={handleUndo}
              className={`p-2.5 rounded-xl transition ${
                canUndo
                  ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="やり直す (Ctrl+Y)"
              disabled={!canRedo}
              onClick={handleRedo}
              className={`p-2.5 rounded-xl transition ${
                canRedo
                  ? 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  : 'text-zinc-600 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              title="すべてクリア"
              onClick={handleClear}
              className="p-2.5 rounded-xl text-zinc-500 hover:bg-red-500/10 hover:text-red-400 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Canvas Display Viewport */}
        <main className="flex-1 overflow-auto flex items-center justify-center p-6 bg-zinc-950/90 relative">
          <div className="relative shadow-2xl rounded-lg overflow-hidden border border-zinc-800 bg-black">
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="block cursor-crosshair max-w-full max-h-[calc(100vh-6rem)] object-contain"
            />
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-sm z-50 animate-in fade-in slide-in-from-bottom-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
