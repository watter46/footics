'use client';

import { FilePlus2, FolderKanban, Upload, X } from 'lucide-react';

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
    <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#191920]/80">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <FolderKanban size={20} />
        </div>
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            戦術プロジェクト管理
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
              {projectCount} 件
            </span>
          </h2>
          <p className="text-xs text-white/50">
            保存済みプロジェクトの管理・切り替え・複製・一括操作
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10 text-xs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = view === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onViewChange(tab.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {Icon && <Icon size={13} />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer ml-2"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
