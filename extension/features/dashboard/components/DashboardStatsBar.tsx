import type React from 'react';

export interface DashboardStatsBarProps {
  totalScreenshots: number;
  totalGroups: number;
  totalFavorites: number;
}

export const DashboardStatsBar: React.FC<DashboardStatsBarProps> = ({
  totalScreenshots,
  totalGroups,
  totalFavorites,
}) => {
  return (
    <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
        <span className="text-xs text-zinc-400">総スクリーンショット数</span>
        <span className="text-2xl font-bold text-zinc-100 mt-1">
          {totalScreenshots}
          <span className="text-xs text-zinc-500 ml-1">枚</span>
        </span>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
        <span className="text-xs text-zinc-400">グループ化された動画数</span>
        <span className="text-2xl font-bold text-zinc-100 mt-1">
          {totalGroups}
          <span className="text-xs text-zinc-500 ml-1">本</span>
        </span>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
        <span className="text-xs text-zinc-400">お気に入り保存数</span>
        <span className="text-2xl font-bold text-amber-400 mt-1">
          {totalFavorites}
          <span className="text-xs text-zinc-500 ml-1">枚</span>
        </span>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between">
        <span className="text-xs text-zinc-400">自動クリーンアップ設定</span>
        <div className="text-xs text-emerald-400 font-medium mt-1">
          90日超・100枚超過時自動整理
        </div>
      </div>
    </section>
  );
};
