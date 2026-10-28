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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/patterns/empty-state';
import { ErrorState } from '@/components/ui/patterns/error-state';
import { PageLoading } from '@/components/ui/patterns/loading-state';
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
      const list = (json.items ??
        json.data ??
        []) as TacticalExportShareSummary[];
      setItems(list);
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
    <div className="min-h-screen bg-surface-l0 text-white flex flex-col select-none">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-surface-l1/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-white/80 to-white/60 bg-clip-text text-transparent">
              Footics Export Studio
            </span>
          </Link>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Smartphone className="w-2.5 h-2.5" />
            PWA
          </span>
        </div>

        <Button
          variant="secondary"
          size="icon-sm"
          onClick={fetchItems}
          disabled={isLoading}
          aria-label="Refresh list"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
          />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Shared Exports</h1>
            <p className="text-xs text-white/60">
              PCから送信されたアニメーション（保持期間: 24時間）
            </p>
          </div>
          <span className="text-xs font-mono text-white/60 bg-surface-l2 px-2.5 py-1 rounded-lg border border-white/[0.08]">
            {items.length} items
          </span>
        </div>

        {/* Loading state */}
        {isLoading && items.length === 0 && (
          <PageLoading message="共有データを読み込み中..." />
        )}

        {/* Error state */}
        {error && !isLoading && items.length === 0 && (
          <ErrorState
            title="読み込みに失敗しました"
            message={error}
            onRetry={fetchItems}
            retryLabel="再試行"
          />
        )}

        {/* Empty state */}
        {!isLoading && items.length === 0 && !error && (
          <EmptyState
            icon={Film}
            title="No Shared Exports"
            description="PC版の「iPhoneへ送信」ボタンからプロジェクトを共有すると、ここに自動表示されます。"
          />
        )}

        {/* List */}
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.shareId}
              className="bg-surface-l2 border-white/[0.08] p-4 flex flex-col gap-3 shadow-lg hover:border-white/20 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm text-white truncate">
                    {item.title || 'Untitled Animation'}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/40" />
                      {formatCreatedAt(item.createdAt)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-white/40" />
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
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(item.shareId, item.title)}
                  disabled={deletingId === item.shareId}
                  aria-label="Delete item"
                  className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 gap-1.5"
                >
                  {deletingId === item.shareId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  <span>削除</span>
                </Button>

                <Link
                  href={`/export/share/${item.shareId}`}
                  aria-label="Open preview"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-orange hover:bg-accent-orange/90 text-white transition-colors shadow-md"
                >
                  <span>Preview & Export</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
