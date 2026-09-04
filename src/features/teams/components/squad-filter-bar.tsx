'use client';

import type React from 'react';

export type IdFilterType = 'all' | 'official' | 'manual';

export interface SquadFilterBarProps {
  idFilter: IdFilterType;
  onFilterChange: (filter: IdFilterType) => void;
  totalCount: number;
  officialCount: number;
  manualCount: number;
}

export const SquadFilterBar: React.FC<SquadFilterBarProps> = ({
  idFilter,
  onFilterChange,
  totalCount,
  officialCount,
  manualCount,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/60 rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <span>表示フィルター:</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
              idFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            すべて ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('official')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              idFilter === 'official'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800/60 hover:bg-slate-800 text-blue-300 hover:text-blue-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>WhoScored 登録済 ({officialCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('manual')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
              idFilter === 'manual'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-800/60 hover:bg-slate-800 text-amber-300 hover:text-amber-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>ID未登録 (手動) ({manualCount})</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] text-slate-500 font-medium">
        {idFilter === 'manual' && manualCount > 0 && (
          <span className="text-amber-400">
            ※ ID未登録の選手はカードをクリックしてWhoScored IDと紐付けできます
          </span>
        )}
      </div>
    </div>
  );
};
