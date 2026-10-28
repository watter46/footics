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
import { IconButton } from '@/components/ui/icon-button';
import type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
import { cn } from '@/lib/utils';
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
      className={cn(
        'group flex items-center justify-between px-4 py-3 transition-colors cursor-pointer text-left border-b border-white/[0.07] last:border-b-0',
        isSelected
          ? 'bg-[#FF8100]/15 border-l-2 border-l-[#FF8100]'
          : isActive
            ? 'bg-[#18181B] border-l-2 border-l-[#FF8100]'
            : 'hover:bg-[#18181B]',
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e) => onToggleSelect(e, project.id)}
          title={isSelected ? '選択解除' : '選択'}
        >
          {isSelected ? (
            <CheckSquare strokeWidth={1.5} className="text-[#FF8100]" />
          ) : (
            <Square
              strokeWidth={1.5}
              className="opacity-40 group-hover:opacity-100"
            />
          )}
        </IconButton>

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
                className="px-2 py-0.5 bg-[#0D0D0E] border border-[#FF8100]/60 rounded-[6px] text-xs text-white focus:outline-none font-sans"
              />
              <IconButton type="submit" size="xs" variant="primary">
                <Check strokeWidth={1.5} />
              </IconButton>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#F4F4F5] group-hover:text-white truncate">
                {project.title}
              </span>
              {isActive && (
                <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#FF8100]/15 text-[#FF8100] border border-[#FF8100]/30 font-mono">
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

      <div className="flex items-center gap-1 bg-[#0D0D0E] p-0.5 rounded-[8px] border border-white/[0.07] shrink-0 ml-3">
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e) => onStartRename(e, project)}
          title="名前を変更"
        >
          <Edit2 strokeWidth={1.5} />
        </IconButton>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e) => onDuplicate(e, project.id)}
          title="プロジェクトを複製"
        >
          <Copy strokeWidth={1.5} />
        </IconButton>
        <IconButton
          size="xs"
          variant="ghost"
          onClick={(e) => onExportJson(e, project.id)}
          title="プロジェクトをJSONファイルとしてダウンロード保存"
        >
          <Download strokeWidth={1.5} className="text-[#60A5FA]" />
        </IconButton>
        <IconButton
          size="xs"
          variant="danger"
          onClick={(e) => onDelete(e, project)}
          title="プロジェクトを削除"
        >
          <Trash2 strokeWidth={1.5} />
        </IconButton>
      </div>
    </div>
  );
}
