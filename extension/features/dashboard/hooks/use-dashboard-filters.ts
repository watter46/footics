import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';
import { groupScreenshotsByVideo, type VideoGroup } from '../utils/grouping';

export interface UseDashboardFiltersReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filterFavorites: boolean;
  setFilterFavorites: React.Dispatch<React.SetStateAction<boolean>>;
  groups: VideoGroup[];
  toggleGroupExpanded: (key: string) => void;
  isGroupExpanded: (key: string) => boolean;
}

export function useDashboardFilters(
  screenshots: CapturedScreenshot[],
): UseDashboardFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

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
    return groupScreenshotsByVideo(filteredScreenshots);
  }, [filteredScreenshots]);

  const toggleGroupExpanded = useCallback((key: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  }, []);

  const isGroupExpanded = useCallback(
    (key: string) => {
      return expandedGroups[key] ?? true;
    },
    [expandedGroups],
  );

  return {
    searchQuery,
    setSearchQuery,
    filterFavorites,
    setFilterFavorites,
    groups,
    toggleGroupExpanded,
    isGroupExpanded,
  };
}
