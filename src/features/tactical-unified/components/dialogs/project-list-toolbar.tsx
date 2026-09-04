'use client';

import {
  Archive,
  CheckSquare,
  LayoutGrid,
  List,
  Search,
  Square,
  Trash2,
} from 'lucide-react';

export interface ProjectListToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filteredCount: number;
  selectedCount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  isProcessingBulk: boolean;
  onBulkExport: () => void;
  onBulkDelete: () => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

export function ProjectListToolbar({
  searchQuery,
  onSearchChange,
  filteredCount,
  selectedCount,
  isAllSelected,
  onSelectAll,
  isProcessingBulk,
  onBulkExport,
  onBulkDelete,
  viewMode,
  onViewModeChange,
}: ProjectListToolbarProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#121216] gap-3">
      <div className="relative flex-1 max-w-sm">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="プロジェクト名で検索..."
          className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        {filteredCount > 0 && (
          <button
            type="button"
            onClick={onSelectAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare size={13} className="text-blue-400" />
            ) : (
              <Square size={13} />
            )}
            <span className="hidden sm:inline">
              {isAllSelected ? '全解除' : '全選択'}
            </span>
          </button>
        )}

        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-500/30">
            <span className="text-xs font-semibold text-blue-300 mr-1">
              {selectedCount} 件選択中
            </span>
            <button
              type="button"
              onClick={onBulkExport}
              disabled={isProcessingBulk}
              className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Archive size={12} />
              <span>一括Export (ZIP)</span>
            </button>
            <button
              type="button"
              onClick={onBulkDelete}
              disabled={isProcessingBulk}
              className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={12} />
              <span>一括削除</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <List size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
