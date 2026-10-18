import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as screenshotDb from '../../../capture/db/screenshot-db';
import type { VideoGroup } from '../../utils/grouping';
import { useDashboardData } from '../use-dashboard-data';

vi.mock('../../../capture/db/screenshot-db', () => ({
  getAllScreenshots: vi.fn(),
  toggleFavorite: vi.fn(),
  deleteScreenshot: vi.fn(),
  deleteScreenshotsByVideo: vi.fn(),
}));

describe('useDashboardData', () => {
  const mockScreenshots: screenshotDb.CapturedScreenshot[] = [
    {
      id: 'shot-1',
      timestamp: 1000,
      videoUrl: 'https://youtube.com/v1',
      videoTitle: 'Match 1',
      imageDataUrl: 'data:image/png;base64,1',
      isFavorite: false,
    },
    {
      id: 'shot-2',
      timestamp: 2000,
      videoUrl: 'https://youtube.com/v1',
      videoTitle: 'Match 1',
      imageDataUrl: 'data:image/png;base64,2',
      isFavorite: true,
    },
  ];

  const originalConfirm = window.confirm;

  beforeEach(() => {
    vi.clearAllMocks();
    (screenshotDb.getAllScreenshots as any).mockResolvedValue(mockScreenshots);
    window.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('マウント時にデータを取得し、screenshots と totalFavoriteCount を初期化する', async () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.screenshots).toEqual(mockScreenshots);
    expect(result.current.totalFavoriteCount).toBe(1);
    expect(screenshotDb.getAllScreenshots).toHaveBeenCalledTimes(1);
  });

  it('handleToggleFavorite でお気に入りフラグが反転して更新される', async () => {
    (screenshotDb.toggleFavorite as any).mockResolvedValue(true);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleToggleFavorite('shot-1');
    });

    expect(screenshotDb.toggleFavorite).toHaveBeenCalledWith('shot-1');
    expect(
      result.current.screenshots.find((s) => s.id === 'shot-1')?.isFavorite,
    ).toBe(true);
    expect(result.current.totalFavoriteCount).toBe(2);
  });

  it('handleDeleteSingle で確認ダイアログがOKの場合に削除が実行される', async () => {
    (screenshotDb.deleteScreenshot as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.handleDeleteSingle('shot-1');
    });

    expect(screenshotDb.deleteScreenshot).toHaveBeenCalledWith('shot-1');
    expect(result.current.screenshots.some((s) => s.id === 'shot-1')).toBe(
      false,
    );
    expect(result.current.toastMessage).toContain('削除しました');
  });

  it('handleDeleteGroup で特定動画のスクリーンショットが一括削除される', async () => {
    (screenshotDb.deleteScreenshotsByVideo as any).mockResolvedValue(2);

    const { result } = renderHook(() => useDashboardData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const group: VideoGroup = {
      videoUrl: 'https://youtube.com/v1',
      videoTitle: 'Match 1',
      screenshots: mockScreenshots,
      latestTimestamp: 2000,
      count: 2,
      favoriteCount: 1,
    };

    await act(async () => {
      await result.current.handleDeleteGroup(group);
    });

    expect(screenshotDb.deleteScreenshotsByVideo).toHaveBeenCalledWith(
      'https://youtube.com/v1',
    );
    expect(result.current.screenshots).toHaveLength(0);
    expect(result.current.toastMessage).toContain('2 件');
  });
});
