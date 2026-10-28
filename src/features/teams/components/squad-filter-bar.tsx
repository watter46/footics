'use client';

import {
  type FilterItem,
  FilterPills,
} from '@/components/ui/patterns/filter-pills';

export type IdFilterType = 'all' | 'official' | 'manual';

export interface SquadFilterBarProps {
  idFilter: IdFilterType;
  onFilterChange: (filter: IdFilterType) => void;
  totalCount: number;
  officialCount: number;
  manualCount: number;
}

export function SquadFilterBar({
  idFilter,
  onFilterChange,
  totalCount,
  officialCount,
  manualCount,
}: SquadFilterBarProps) {
  const filterItems: FilterItem<IdFilterType>[] = [
    { id: 'all', label: 'すべて', count: totalCount },
    {
      id: 'official',
      label: 'WhoScored 登録済',
      count: officialCount,
      icon: <span className="size-2 rounded-full bg-blue-400" />,
    },
    {
      id: 'manual',
      label: 'ID未登録 (手動)',
      count: manualCount,
      icon: <span className="size-2 rounded-full bg-amber-400" />,
    },
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-l1 border border-white/[0.08] rounded-xl p-3">
      <div className="flex items-center gap-2 text-xs text-white/60 font-medium">
        <span>表示フィルター:</span>
        <FilterPills
          items={filterItems}
          value={idFilter}
          onChange={onFilterChange}
        />
      </div>

      <div className="text-[11px] text-white/40 font-medium">
        {idFilter === 'manual' && manualCount > 0 && (
          <span className="text-accent-orange">
            ※ ID未登録の選手はカードをクリックしてWhoScored IDと紐付けできます
          </span>
        )}
      </div>
    </div>
  );
}
