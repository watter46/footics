import {
  Archive,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  Film,
  FolderOpen,
  Pencil,
  RefreshCw,
  Search,
  Star,
  Trash2,
  Video,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CapturedScreenshot,
  deleteScreenshot,
  deleteScreenshotsByVideo,
  getAllScreenshots,
  toggleFavorite,
} from '../../capture/db/screenshot-db';
import { groupScreenshotsByVideo, type VideoGroup } from '../utils/grouping';

export const DashboardView: React.FC = () => {
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllScreenshots();
      setScreenshots(data);
    } catch (err) {
      console.error('Failed to load screenshots:', err);
      showToast('スクリーンショットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Grouping & Filtering
  const filteredScreenshots = useMemo(() => {
    let list = screenshots;
    if (filterFavorites) {
      list = list.filter((s) => s.isFavorite);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (s) =>
          s.videoTitle.toLowerCase().includes(q) ||
          s.videoUrl.toLowerCase().includes(q),
      );
    }
    return list;
  }, [screenshots, filterFavorites, searchQuery]);

  const groups = useMemo(() => {
    const res = groupScreenshotsByVideo(filteredScreenshots);
    // 初期状態で全グループを展開
    return res;
  }, [filteredScreenshots]);

  const toggleGroupExpanded = (key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  const isGroupExpanded = (key: string) => {
    return expandedGroups[key] ?? true;
  };

  // Actions
  const handleToggleFavorite = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const nextFav = await toggleFavorite(id);
      setScreenshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isFavorite: nextFav } : s)),
      );
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleDeleteSingle = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm('このスクリーンショットを削除しますか？')) return;

    try {
      await deleteScreenshot(id);
      setScreenshots((prev) => prev.filter((s) => s.id !== id));
      showToast('🗑️ スクリーンショットを削除しました');
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
      showToast('削除に失敗しました');
    }
  };

  const handleDeleteGroup = async (group: VideoGroup) => {
    if (
      !window.confirm(
        `動画「${group.videoTitle}」のスクリーンショット全 ${group.count} 件を削除しますか？`,
      )
    ) {
      return;
    }

    try {
      await deleteScreenshotsByVideo(group.videoUrl);
      setScreenshots((prev) =>
        prev.filter((s) => s.videoUrl !== group.videoUrl),
      );
      showToast(`🗑️ ${group.count} 件のスクリーンショットを削除しました`);
    } catch (err) {
      console.error('Failed to delete group:', err);
      showToast('一括削除に失敗しました');
    }
  };

  const handleDownloadSingle = (
    screenshot: CapturedScreenshot,
    e?: React.MouseEvent,
  ) => {
    e?.stopPropagation();
    const a = document.createElement('a');
    a.href = screenshot.imageDataUrl;
    const cleanTitle = screenshot.videoTitle.replace(/[/\\?%*:|"<>]/g, '_');
    a.download = `footics_${cleanTitle}_${screenshot.id}.png`;
    a.click();
  };

  const handleDownloadGroup = async (group: VideoGroup) => {
    showToast(`⏳ ${group.count} 枚のスクリーンショットをダウンロード中...`);
    for (let i = 0; i < group.screenshots.length; i++) {
      const s = group.screenshots[i];
      handleDownloadSingle(s);
      await new Promise((r) => setTimeout(r, 200));
    }
    showToast(`✅ ${group.count} 枚のダウンロードが完了しました`);
  };

  const handleOpenCanvas = (id: string) => {
    const canvasUrl = browser?.runtime?.getURL
      ? browser.runtime.getURL(`/canvas.html?id=${id}`)
      : `/canvas.html?id=${id}`;

    if (browser?.tabs?.create) {
      browser.tabs.create({ url: canvasUrl, active: true });
    } else {
      window.open(canvasUrl, '_blank');
    }
  };

  const totalFavoriteCount = useMemo(
    () => screenshots.filter((s) => s.isFavorite).length,
    [screenshots],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Film className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
              Footics 動画別ダッシュボード
            </h1>
            <p className="text-xs text-zinc-400">
              キャプチャした戦術スクリーンショットの管理・編集
            </p>
          </div>
        </div>

        {/* Stats & Search Toolbar */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="動画タイトルやURLで検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-52 md:w-64 transition"
            />
          </div>

          {/* Filter Favorites */}
          <button
            type="button"
            onClick={() => setFilterFavorites((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
              filterFavorites
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Star
              className={`w-3.5 h-3.5 ${
                filterFavorites ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
            <span>お気に入りのみ ({totalFavoriteCount})</span>
          </button>

          {/* Reload */}
          <button
            type="button"
            onClick={loadData}
            title="再読み込み"
            className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Global Statistics Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-xs text-zinc-400">
              総スクリーンショット数
            </span>
            <span className="text-2xl font-bold text-zinc-100 mt-1">
              {screenshots.length}
              <span className="text-xs text-zinc-500 ml-1">枚</span>
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-xs text-zinc-400">
              グループ化された動画数
            </span>
            <span className="text-2xl font-bold text-zinc-100 mt-1">
              {groups.length}
              <span className="text-xs text-zinc-500 ml-1">本</span>
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-xs text-zinc-400">お気に入り保存数</span>
            <span className="text-2xl font-bold text-amber-400 mt-1">
              {totalFavoriteCount}
              <span className="text-xs text-zinc-500 ml-1">枚</span>
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-zinc-400">
              自動クリーンアップ設定
            </span>
            <div className="text-xs text-emerald-400 font-medium mt-1">
              90日超・100枚超過時自動整理
            </div>
          </div>
        </section>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
            <span className="text-sm">スクリーンショットを読み込み中...</span>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
            <FolderOpen className="w-12 h-12 mb-3 text-zinc-600" />
            <p className="text-base font-medium text-zinc-300">
              スクリーンショットがありません
            </p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
              動画再生中に{' '}
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-300 font-mono text-[10px]">
                Alt + S
              </kbd>{' '}
              を押すと、フレームを自動キャプチャしてクイック編集できます。
            </p>
          </div>
        ) : (
          /* Video Groups List */
          <div className="flex flex-col gap-6">
            {groups.map((group) => {
              const groupKey = group.videoUrl || group.videoTitle;
              const isExpanded = isGroupExpanded(groupKey);

              return (
                <article
                  key={groupKey}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm"
                >
                  {/* Group Header Card */}
                  <div
                    onClick={() => toggleGroupExpanded(groupKey)}
                    className="px-5 py-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between cursor-pointer hover:bg-zinc-850 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        className="text-zinc-400 hover:text-zinc-200"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>

                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Video className="w-4 h-4 text-emerald-400" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm font-semibold text-zinc-200 truncate">
                            {group.videoTitle}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 shrink-0">
                            {group.count} 枚
                          </span>
                          {group.favoriteCount > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-400 shrink-0">
                              <Star className="w-3 h-3 fill-amber-400" />
                              {group.favoriteCount}
                            </span>
                          )}
                        </div>

                        {group.videoUrl && (
                          <a
                            href={group.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-zinc-500 hover:text-emerald-400 flex items-center gap-1 truncate mt-0.5"
                          >
                            <span>{group.videoUrl}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Group Action Buttons */}
                    <div
                      className="flex items-center gap-2 shrink-0 ml-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleDownloadGroup(group)}
                        title="この動画のスクショを一括保存"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-medium text-zinc-300 transition"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>一括保存</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGroup(group)}
                        title="この動画のスクショを一括削除"
                        className="p-1.5 bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-zinc-700 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Screenshots Grid (Collapsible) */}
                  {isExpanded && (
                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 bg-zinc-950/40">
                      {group.screenshots.map((s) => (
                        <div
                          key={s.id}
                          className="group relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition flex flex-col shadow-sm"
                        >
                          {/* Thumbnail / Image Preview */}
                          <div
                            onClick={() => handleOpenCanvas(s.id)}
                            className="aspect-video bg-black/80 relative cursor-pointer overflow-hidden flex items-center justify-center"
                          >
                            <img
                              src={s.thumbnailDataUrl || s.imageDataUrl}
                              alt={s.videoTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              loading="lazy"
                            />

                            {/* Hover Overlay with Edit Prompt */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                              <span className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-lg">
                                <Pencil className="w-3.5 h-3.5" />
                                編集する
                              </span>
                            </div>

                            {/* Favorite Button (Top Right) */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(s.id, e)}
                              title={
                                s.isFavorite
                                  ? 'お気に入り解除'
                                  : 'お気に入り追加'
                              }
                              className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur border border-white/10 transition z-10"
                            >
                              <Star
                                className={`w-3.5 h-3.5 ${
                                  s.isFavorite
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                              />
                            </button>

                            {/* Video Time Tag (Bottom Left) */}
                            {s.videoTime !== undefined && s.videoTime > 0 && (
                              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] text-zinc-300 font-mono">
                                {Math.floor(s.videoTime / 60)}:
                                {(s.videoTime % 60).toString().padStart(2, '0')}
                              </div>
                            )}
                          </div>

                          {/* Card Footer Info */}
                          <div className="p-3 flex items-center justify-between text-xs text-zinc-400 bg-zinc-900/90 border-t border-zinc-800">
                            <span className="text-[11px] text-zinc-500">
                              {new Date(s.timestamp).toLocaleDateString()}{' '}
                              {new Date(s.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => handleDownloadSingle(s, e)}
                                title="ダウンロード"
                                className="p-1 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDeleteSingle(s.id, e)}
                                title="削除"
                                className="p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl text-sm z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
