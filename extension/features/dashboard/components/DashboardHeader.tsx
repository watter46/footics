import { Film, RefreshCw, Search, Star } from 'lucide-react';

export interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterFavorites: boolean;
  onToggleFilterFavorites: () => void;
  totalFavoriteCount: number;
  onReload: () => void;
}

export function DashboardHeader({
  searchQuery,
  onSearchChange,
  filterFavorites,
  onToggleFilterFavorites,
  totalFavoriteCount,
  onReload,
}: DashboardHeaderProps) {
  return (
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

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        {/* Search Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="動画タイトルやURLで検索..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 py-1.5 bg-zinc-800/90 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-52 md:w-64 transition"
          />
        </div>

        {/* Filter Favorites */}
        <button
          type="button"
          onClick={onToggleFilterFavorites}
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
          onClick={onReload}
          title="再読み込み"
          className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
