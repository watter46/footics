'use client';

import {
  Archive,
  CheckSquare,
  LayoutGrid,
  List,
  Square,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';

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

const VIEW_OPTIONS: {
  id: 'grid' | 'list';
  label: string;
  icon: typeof List;
}[] = [
  { id: 'grid', label: 'グリッド', icon: LayoutGrid },
  { id: 'list', label: 'リスト', icon: List },
];

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
    <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.07] bg-[#121214] gap-3">
      <div className="flex-1 max-w-sm">
        <SearchInput
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder="プロジェクト名で検索..."
        />
      </div>

      <div className="flex items-center gap-2">
        {filteredCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onSelectAll}
            icon={
              isAllSelected ? (
                <CheckSquare className="text-[#FF8100]" />
              ) : (
                <Square />
              )
            }
          >
            <span className="hidden sm:inline">
              {isAllSelected ? '全解除' : '全選択'}
            </span>
          </Button>
        )}

        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-[#18181B] px-2 py-1 rounded-[8px] border border-[#FF8100]/30">
            <span className="text-xs font-semibold text-[#FF8100] mr-1">
              {selectedCount} 件選択中
            </span>
            <Button
              variant="primary"
              size="xs"
              onClick={onBulkExport}
              disabled={isProcessingBulk}
              icon={<Archive />}
            >
              一括Export (ZIP)
            </Button>
            <Button
              variant="danger"
              size="xs"
              onClick={onBulkDelete}
              disabled={isProcessingBulk}
              icon={<Trash2 />}
            >
              一括削除
            </Button>
          </div>
        )}

        <SegmentedControl
          value={viewMode}
          options={VIEW_OPTIONS}
          onChange={onViewModeChange}
        />
      </div>
    </div>
  );
}
