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
      className={`group flex items-center justify-between px-4 py-3 transition-colors cursor-pointer text-left ${
        isSelected
          ? 'bg-blue-900/30'
          : isActive
            ? 'bg-blue-900/20'
            : 'hover:bg-white/5'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Checkbox */}
        <button
          type="button"
          onClick={(e) => onToggleSelect(e, project.id)}
          className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          title={isSelected ? '選択解除' : '選択'}
        >
          {isSelected ? (
            <CheckSquare size={16} className="text-blue-400" />
          ) : (
            <Square size={16} className="opacity-40 group-hover:opacity-100" />
          )}
        </button>

        <div className="p-2 rounded-lg bg-white/5 text-white/60 shrink-0">
          <FolderKanban size={16} />
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
                className="px-2 py-0.5 bg-black/40 border border-blue-500 rounded text-xs text-white focus:outline-none"
              />
              <button
                type="submit"
                className="p-1 rounded bg-blue-600 text-white cursor-pointer"
              >
                <Check size={12} />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/90 group-hover:text-white truncate">
                {project.title}
              </span>
              {isActive && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  編集中
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5 font-mono">
            <span>{project.aspectRatio}</span>
            <span>•</span>
            <span>{project.slideCount} スライド</span>
            <span>•</span>
            <span>更新: {formatProjectDate(project.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Actions (Always Visible) */}
      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0 ml-3">
        <button
          type="button"
          onClick={(e) => onStartRename(e, project)}
          className="p-1.5 rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
          title="名前を変更"
        >
          <Edit2 size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => onDuplicate(e, project.id)}
          className="p-1.5 rounded hover:bg-purple-500/20 text-white/70 hover:text-purple-300 transition-colors cursor-pointer"
          title="プロジェクトを複製"
        >
          <Copy size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => onExportJson(e, project.id)}
          className="p-1.5 rounded hover:bg-blue-500/20 text-white/70 hover:text-blue-300 transition-colors cursor-pointer"
          title="プロジェクトをJSONファイルとしてダウンロード保存"
        >
          <Download size={13} className="text-blue-400" />
        </button>
        <button
          type="button"
          onClick={(e) => onDelete(e, project)}
          className="p-1.5 rounded hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-colors cursor-pointer"
          title="プロジェクトを削除"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
