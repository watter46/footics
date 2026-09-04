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
import type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
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
      className={`group relative flex flex-col justify-between rounded-xl border p-4 transition-all cursor-pointer overflow-hidden text-left ${
        isSelected
          ? 'bg-blue-900/30 border-blue-400 shadow-md ring-2 ring-blue-500'
          : isActive
            ? 'bg-blue-900/20 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/50'
            : 'bg-[#181820] border-white/10 hover:border-white/25 hover:bg-[#1f1f2a]'
      }`}
    >
      {/* Top row: Checkbox, status & Quick Action Icons */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={(e) => onToggleSelect(e, project.id)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title={isSelected ? '選択解除' : '選択'}
          >
            {isSelected ? (
              <CheckSquare size={16} className="text-blue-400" />
            ) : (
              <Square
                size={16}
                className="opacity-40 group-hover:opacity-100"
              />
            )}
          </button>

          {isActive && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 shrink-0">
              <Check size={10} />
              編集中
            </span>
          )}
          <span className="text-[11px] font-mono text-white/40 shrink-0">
            {project.aspectRatio}
          </span>
        </div>

        <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
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

      {/* Title & Rename Form */}
      <div className="mb-3">
        {isEditing ? (
          <form onSubmit={onCommitRename} className="flex items-center gap-1">
            <input
              ref={(el) => el?.focus()}
              type="text"
              value={editingTitle}
              onChange={(e) => onEditingTitleChange(e.target.value)}
              onBlur={() => onCommitRename()}
              className="w-full px-2 py-1 bg-black/40 border border-blue-500 rounded text-xs text-white focus:outline-none"
            />
            <button
              type="submit"
              className="p-1 rounded bg-blue-600 text-white cursor-pointer"
            >
              <Check size={12} />
            </button>
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

      {/* Metadata Footer */}
      <div className="flex items-center justify-between text-[10px] text-white/50 border-t border-white/5 pt-2 mt-auto">
        <span className="flex items-center gap-1">
          <Layers size={11} className="text-blue-400" />
          <span>{project.slideCount} スライド</span>
        </span>

        <span className="flex items-center gap-1" title={project.updatedAt}>
          <Clock size={11} className="text-white/40" />
          <span>{formatProjectDate(project.updatedAt)}</span>
        </span>
      </div>
    </div>
  );
}
