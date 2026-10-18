import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import { useDashboardFilters } from '../use-dashboard-filters';

describe('useDashboardFilters', () => {
  const dummyItems: CapturedScreenshot[] = [
    {
      id: 's1',
      timestamp: 1000,
      videoUrl: 'https://youtube.com/v1',
      videoTitle: 'Arsenal vs Chelsea',
      imageDataUrl: 'data:image/png;base64,1',
      isFavorite: false,
    },
    {
      id: 's2',
      timestamp: 2000,
      videoUrl: 'https://youtube.com/v1',
      videoTitle: 'Arsenal vs Chelsea',
      imageDataUrl: 'data:image/png;base64,2',
      isFavorite: true,
    },
    {
      id: 's3',
      timestamp: 3000,
      videoUrl: 'https://youtube.com/v2',
      videoTitle: 'Liverpool vs Man City',
      imageDataUrl: 'data:image/png;base64,3',
      isFavorite: false,
    },
  ];

  it('初期状態では全グループが取得でき、全グループが開いている（expanded）状態である', () => {
    const { result } = renderHook(() => useDashboardFilters(dummyItems));

    expect(result.current.searchQuery).toBe('');
    expect(result.current.filterFavorites).toBe(false);
    expect(result.current.groups).toHaveLength(2);
    expect(result.current.isGroupExpanded('https://youtube.com/v1')).toBe(true);
    expect(result.current.isGroupExpanded('https://youtube.com/v2')).toBe(true);
  });

  it('searchQuery の変更でタイトルまたはURLにマッチするスクショのみが抽出される', () => {
    const { result } = renderHook(() => useDashboardFilters(dummyItems));

    act(() => {
      result.current.setSearchQuery('Liverpool');
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].videoTitle).toBe('Liverpool vs Man City');
  });

  it('filterFavorites を true にするとお気に入りのスクショのみに絞り込まれる', () => {
    const { result } = renderHook(() => useDashboardFilters(dummyItems));

    act(() => {
      result.current.setFilterFavorites(true);
    });

    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0].videoUrl).toBe('https://youtube.com/v1');
    expect(result.current.groups[0].screenshots).toHaveLength(1);
    expect(result.current.groups[0].screenshots[0].id).toBe('s2');
  });

  it('toggleGroupExpanded でアコーディオンの開閉がトグルされる', () => {
    const { result } = renderHook(() => useDashboardFilters(dummyItems));

    const groupKey = 'https://youtube.com/v1';
    expect(result.current.isGroupExpanded(groupKey)).toBe(true);

    act(() => {
      result.current.toggleGroupExpanded(groupKey);
    });
    expect(result.current.isGroupExpanded(groupKey)).toBe(false);

    act(() => {
      result.current.toggleGroupExpanded(groupKey);
    });
    expect(result.current.isGroupExpanded(groupKey)).toBe(true);
  });
});
