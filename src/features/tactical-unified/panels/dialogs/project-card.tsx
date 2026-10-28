'use client';

import {
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit2,
  Layers,
  Square,
  Trash2,
} from 'lucide-react';
import type React from 'react';
import { IconButton } from '@/components/ui/icon-button';
import type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
import { cn } from '@/lib/utils';
import { formatProjectDate } from './project-dialog-utils';

export interface ProjectCardProps {
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

export function ProjectCard({
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
}: ProjectCardProps) {
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
        'group relative flex flex-col justify-between rounded-[12px] border p-4 transition-all cursor-pointer overflow-hidden text-left',
        isSelected
          ? 'bg-[#FF8100]/10 border-[#FF8100] ring-1 ring-[#FF8100]/50'
          : isActive
            ? 'bg-[#18181B] border-[#FF8100]/60'
            : 'bg-[#18181B] border-white/[0.07] hover:border-white/[0.16] hover:bg-[#222226]',
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e) => onToggleSelect(e, project.id)}
            title={isSelected ? '選択解除' : '選択'}
          >
            {isSelected ? (
              <CheckSquare className="text-[#FF8100]" />
            ) : (
              <Square className="opacity-40 group-hover:opacity-100" />
            )}
          </IconButton>

          {isActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-bold bg-[#FF8100]/15 text-[#FF8100] border border-[#FF8100]/30 shrink-0">
              <Check size={10} />
              編集中
            </span>
          )}
          <span className="text-[11px] font-mono text-[#71717A] shrink-0">
            {project.aspectRatio}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-[#0D0D0E] p-0.5 rounded-[8px] border border-white/[0.07] shrink-0">
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e) => onStartRename(e, project)}
            title="名前を変更"
          >
            <Edit2 />
          </IconButton>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e) => onDuplicate(e, project.id)}
            title="プロジェクトを複製"
          >
            <Copy />
          </IconButton>
          <IconButton
            size="xs"
            variant="ghost"
            onClick={(e) => onExportJson(e, project.id)}
            title="プロジェクトをJSONファイルとしてダウンロード保存"
          >
            <Download className="text-[#60A5FA]" />
          </IconButton>
          <IconButton
            size="xs"
            variant="danger"
            onClick={(e) => onDelete(e, project)}
            title="プロジェクトを削除"
          >
            <Trash2 />
          </IconButton>
        </div>
      </div>

      <div className="mb-3">
        {isEditing ? (
          <form onSubmit={onCommitRename} className="flex items-center gap-1">
            <input
              ref={(el) => el?.focus()}
              type="text"
              value={editingTitle}
              onChange={(e) => onEditingTitleChange(e.target.value)}
              onBlur={() => onCommitRename()}
              className="w-full px-2 py-1 bg-[#0D0D0E] border border-[#FF8100] rounded-[6px] text-xs text-white focus:outline-none"
            />
            <IconButton type="submit" size="xs" variant="primary">
              <Check />
            </IconButton>
          </form>
        ) : (
          <h3
            className="text-sm font-semibold text-white/90 group-hover:text-white truncate"
            title={project.title}
          >
            {project.title}
          </h3>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] border-t border-white/[0.07] pt-2 mt-auto">
        <span className="flex items-center gap-1">
          <Layers size={11} className="text-[#60A5FA]" />
          <span>{project.slideCount} スライド</span>
        </span>

        <span className="flex items-center gap-1" title={project.updatedAt}>
          <Clock size={11} className="text-[#71717A]" />
          <span>{formatProjectDate(project.updatedAt)}</span>
        </span>
      </div>
    </div>
  );
}
