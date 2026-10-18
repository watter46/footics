import type React from 'react';
import { useDashboardData } from '../hooks/use-dashboard-data';
import { useDashboardFilters } from '../hooks/use-dashboard-filters';
import { useScreenshotActions } from '../hooks/use-screenshot-actions';
import { DashboardHeader } from './DashboardHeader';
import { DashboardStatsBar } from './DashboardStatsBar';
import { ScreenshotEmptyState } from './ScreenshotEmptyState';
import { VideoGroupCard } from './VideoGroupCard';

export const DashboardView: React.FC = () => {
  const {
    screenshots,
    loading,
    toastMessage,
    loadData,
    handleToggleFavorite,
    handleDeleteSingle,
    handleDeleteGroup,
    totalFavoriteCount,
    showToast,
  } = useDashboardData();

  const {
    searchQuery,
    setSearchQuery,
    filterFavorites,
    setFilterFavorites,
    groups,
    toggleGroupExpanded,
    isGroupExpanded,
  } = useDashboardFilters(screenshots);

  const { handleDownloadSingle, handleDownloadGroup, handleOpenCanvas } =
    useScreenshotActions({ showToast });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans select-none">
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterFavorites={filterFavorites}
        onToggleFilterFavorites={() => setFilterFavorites((prev) => !prev)}
        totalFavoriteCount={totalFavoriteCount}
        onReload={loadData}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        <DashboardStatsBar
          totalScreenshots={screenshots.length}
          totalGroups={groups.length}
          totalFavorites={totalFavoriteCount}
        />

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-24 text-zinc-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
            <span className="text-sm">スクリーンショットを読み込み中...</span>
          </div>
        ) : groups.length === 0 ? (
          <ScreenshotEmptyState />
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => {
              const groupKey = group.videoUrl || group.videoTitle;
              return (
                <VideoGroupCard
                  key={groupKey}
                  group={group}
                  isExpanded={isGroupExpanded(groupKey)}
                  onToggleExpand={() => toggleGroupExpanded(groupKey)}
                  onDownloadGroup={handleDownloadGroup}
                  onDeleteGroup={handleDeleteGroup}
                  onOpenCanvas={handleOpenCanvas}
                  onToggleFavorite={handleToggleFavorite}
                  onDownloadSingle={handleDownloadSingle}
                  onDeleteSingle={handleDeleteSingle}
                />
              );
            })}
          </div>
        )}
      </main>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-zinc-900 border border-zinc-700 text-zinc-100 px-4 py-3 rounded-xl shadow-2xl text-sm z-50 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
