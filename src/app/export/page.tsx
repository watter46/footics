'use client';

import {
  Clock,
  ExternalLink,
  Film,
  Layers,
  Loader2,
  RefreshCw,
  Smartphone,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { TacticalExportShareSummary } from '@/lib/tactical/export/share-payload';

function formatCreatedAt(timestamp: number): string {
  const d = new Date(timestamp);
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

export default function ExportListPage(): React.JSX.Element {
  const [items, setItems] = useState<TacticalExportShareSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tactical-export/share');
      if (!res.ok) {
        throw new Error(`Failed to load shares: ${res.status}`);
      }
      const json = await res.json();
      setItems((json.data as TacticalExportShareSummary[]) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      toast.error('エクスポート一覧の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (shareId: string, title: string) => {
    setDeletingId(shareId);
    try {
      const res = await fetch(
        `/api/tactical-export/share?id=${encodeURIComponent(shareId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        throw new Error(`Failed to delete: ${res.status}`);
      }
      setItems((prev) => prev.filter((item) => item.shareId !== shareId));
      toast.success(`「${title || 'プロジェクト'}」を削除しました`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`削除に失敗しました: ${msg}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="h-14 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Footics Export Studio
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Smartphone className="w-2.5 h-2.5" />
            PWA
          </span>
        </div>

        <button
          type="button"
          onClick={fetchItems}
          disabled={isLoading}
          aria-label="Refresh list"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-100">Shared Exports</h1>
            <p className="text-xs text-slate-400">
              PCから送信されたアニメーション（保持期間: 24時間）
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            {items.length} items
          </span>
        </div>

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium">共有データを読み込み中...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && items.length === 0 && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs text-center space-y-2">
            <p>読み込みに失敗しました: {error}</p>
            <button
              type="button"
              onClick={fetchItems}
              className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 rounded-lg text-xs font-semibold transition-colors"
            >
              再試行
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">
                No Shared Exports
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                PC版の「iPhoneへ送信」ボタンからプロジェクトを共有すると、ここに自動表示されます。
              </p>
            </div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.shareId}
              className="bg-slate-900/80 hover:bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 transition-colors shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-slate-100 truncate">
                    {item.title || 'Untitled Animation'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {formatCreatedAt(item.createdAt)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      {item.sceneCount} scenes
                    </span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    {item.aspectRatio}
                  </span>
                  {item.hasBoundaryCrop && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Cropped
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => handleDelete(item.shareId, item.title)}
                  disabled={deletingId === item.shareId}
                  aria-label="Delete item"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {deletingId === item.shareId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>削除</span>
                </button>

                <Link
                  href={`/export/share/${item.shareId}`}
                  aria-label="Open preview"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-md"
                >
                  <span>Preview & Export</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
