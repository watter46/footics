'use client';

import {
  Check,
  CheckSquare,
  Copy,
  Download,
  Edit2,
  FolderKanban,
  Square,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
import { formatProjectDate } from './project-dialog-utils';

export interface ProjectRowProps {
  project: TacticalProjectSummary;
  isActive: boolean;
  isSelected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (id: string) => void;
  onToggleSelect: (e: React.MouseEvent, id: string) => void;
  onStartRename: (e: React.MouseEvent, project: TacticalProjectSummary) => void;
  onCommitRename: (e?: React.FormEvent) => void;
  onEditingTitleChange: (value: string) => void;
  onDuplicate: (e: React.MouseEvent, id: string) => void;
  onExportJson: (e: React.MouseEvent, id: string) => void;
  onDelete: (e: React.MouseEvent, project: TacticalProjectSummary) => void;
}

export function ProjectRow({
  project,
  isActive,
  isSelected,
  isEditing,
  editingTitle,
  onSelect,
  onToggleSelect,
  onStartRename,
  onCommitRename,
  onEditingTitleChange,
  onDuplicate,
  onExportJson,
  onDelete,
}: ProjectRowProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(project.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(project.id);
        }
      }}
      className={`group flex items-center justify-between px-4 py-3 transition-colors cursor-pointer text-left border-b border-white/[0.04] last:border-b-0 ${
        isSelected
          ? 'bg-[#FF5500]/15 border-l-2 border-[#FF5500]'
          : isActive
            ? 'bg-[#18181B] border-l-2 border-[#FF5500]'
            : 'hover:bg-[#18181B]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => onToggleSelect(e, project.id)}
          className="p-1 rounded text-[#71717A] hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer shrink-0"
          title={isSelected ? '選択解除' : '選択'}
        >
          {isSelected ? (
            <CheckSquare
              size={16}
              strokeWidth={1.5}
              className="text-[#FF5500]"
            />
          ) : (
            <Square
              size={16}
              strokeWidth={1.5}
              className="opacity-40 group-hover:opacity-100"
            />
          )}
        </button>

        <div className="p-2 rounded-[6px] bg-[#0D0D0E] text-[#A1A1AA] border border-white/[0.07] shrink-0">
          <FolderKanban size={16} strokeWidth={1.5} />
        </div>

        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form
              onSubmit={onCommitRename}
              className="flex items-center gap-1 max-w-sm"
            >
              <input
                ref={(el) => el?.focus()}
                type="text"
                value={editingTitle}
                onChange={(e) => onEditingTitleChange(e.target.value)}
                onBlur={() => onCommitRename()}
                className="px-2 py-0.5 bg-[#0D0D0E] border border-[#FF5500]/60 rounded text-xs text-white focus:outline-none font-sans"
              />
              <button
                type="submit"
                className="p-1 rounded bg-[#FF5500] text-white cursor-pointer"
              >
                <Check size={12} strokeWidth={1.5} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F4F4F5] group-hover:text-white truncate">
                {project.title}
              </span>
              {isActive && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 font-mono">
                  編集中
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] text-[#71717A] mt-0.5 font-mono">
            <span>{project.aspectRatio}</span>
            <span>•</span>
            <span>{project.slideCount} スライド</span>
            <span>•</span>
            <span>更新: {formatProjectDate(project.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions (Always Visible) */}
      <div className="flex items-center gap-1 bg-[#0D0D0E] p-0.5 rounded-[6px] border border-white/[0.07] shrink-0 ml-3">
        <button
          type="button"
          onClick={(e) => onStartRename(e, project)}
          className="p-1.5 rounded hover:bg-white/[0.08] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          title="名前を変更"
        >
          <Edit2 size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={(e) => onDuplicate(e, project.id)}
          className="p-1.5 rounded hover:bg-white/[0.08] text-[#A1A1AA] hover:text-white transition-colors cursor-pointer"
          title="プロジェクトを複製"
        >
          <Copy size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={(e) => onExportJson(e, project.id)}
          className="p-1.5 rounded hover:bg-[#00A8FF]/15 text-[#00A8FF] transition-colors cursor-pointer"
          title="プロジェクトをJSONファイルとしてダウンロード保存"
        >
          <Download size={13} strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, project)}
          className="p-1.5 rounded hover:bg-[#EB3B5A]/20 text-[#71717A] hover:text-[#EB3B5A] transition-colors cursor-pointer"
          title="プロジェクトを削除"
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
