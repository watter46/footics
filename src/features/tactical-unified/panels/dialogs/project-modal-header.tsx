'use client';

import { FilePlus2, FolderKanban, Upload, X } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';

export type ModalView = 'list' | 'create' | 'import-export';

interface ProjectModalHeaderProps {
  projectCount: number;
  view: ModalView;
  onViewChange: (view: ModalView) => void;
  onClose: () => void;
}

const TABS: Array<{ id: ModalView; label: string; icon?: typeof FilePlus2 }> = [
  { id: 'list', label: '一覧' },
  { id: 'create', label: '新規作成', icon: FilePlus2 },
  { id: 'import-export', label: '入出力', icon: Upload },
];

export function ProjectModalHeader({
  projectCount,
  view,
  onViewChange,
  onClose,
}: ProjectModalHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-[#18181B]">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-[8px] bg-[#FF8100]/10 border border-[#FF8100]/20 text-[#FF8100]">
          <FolderKanban size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            戦術プロジェクト管理
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#222226] border border-white/[0.07] text-[#A1A1AA]">
              {projectCount} 件
            </span>
          </h2>
          <p className="text-xs text-[#71717A]">
            保存済みプロジェクトの管理・切り替え・複製・一括操作
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <SegmentedControl value={view} options={TABS} onChange={onViewChange} />
        <IconButton
          variant="ghost"
          size="md"
          onClick={onClose}
          aria-label="Close dialog"
          className="ml-2"
        >
          <X />
        </IconButton>
      </div>
    </div>
  );
}
