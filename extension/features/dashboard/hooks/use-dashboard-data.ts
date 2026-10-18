import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type CapturedScreenshot,
  deleteScreenshot,
  deleteScreenshotsByVideo,
  getAllScreenshots,
  toggleFavorite,
} from '../../capture/db/screenshot-db';
import type { VideoGroup } from '../utils/grouping';

export interface UseDashboardDataReturn {
  screenshots: CapturedScreenshot[];
  loading: boolean;
  toastMessage: string | null;
  loadData: () => Promise<void>;
  handleToggleFavorite: (id: string, e?: React.MouseEvent) => Promise<void>;
  handleDeleteSingle: (id: string, e?: React.MouseEvent) => Promise<void>;
  handleDeleteGroup: (group: VideoGroup) => Promise<void>;
  totalFavoriteCount: number;
  showToast: (msg: string) => void;
}

export function useDashboardData(): UseDashboardDataReturn {
  const [screenshots, setScreenshots] = useState<CapturedScreenshot[]>([]);
  const [loading, setLoading] = useState(true);
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

  const handleToggleFavorite = useCallback(
    async (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      try {
        const nextFav = await toggleFavorite(id);
        setScreenshots((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isFavorite: nextFav } : s)),
        );
      } catch (err) {
        console.error('Failed to toggle favorite:', err);
      }
    },
    [],
  );

  const handleDeleteSingle = useCallback(
    async (id: string, e?: React.MouseEvent) => {
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
    },
    [showToast],
  );

  const handleDeleteGroup = useCallback(
    async (group: VideoGroup) => {
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
    },
    [showToast],
  );

  const totalFavoriteCount = useMemo(
    () => screenshots.filter((s) => s.isFavorite).length,
    [screenshots],
  );

  return {
    screenshots,
    loading,
    toastMessage,
    loadData,
    handleToggleFavorite,
    handleDeleteSingle,
    handleDeleteGroup,
    totalFavoriteCount,
    showToast,
  };
}
