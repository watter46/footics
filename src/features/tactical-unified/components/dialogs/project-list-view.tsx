'use client';

import { FolderKanban, Loader2 } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
import { ProjectCard } from './project-card';
import { ProjectListToolbar } from './project-list-toolbar';
import { ProjectRow } from './project-row';
import { useProjectActions } from './use-project-actions';

export interface ProjectListViewProps {
  projects: TacticalProjectSummary[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onClose: () => void;
  onCreateClick: () => void;
}

export function ProjectListView({
  projects,
  isLoading,
  onRefresh,
  onClose,
  onCreateClick,
}: ProjectListViewProps) {
  const currentProjectId = useTacticalUnifiedStore((s) => s.project.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const actions = useProjectActions({ onRefresh, onClose });

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected =
    filteredProjects.length > 0 && selectedIds.size === filteredProjects.length;

  const handleSelectAll = () => {
    if (isAllSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
  };

  const handleStartRename = (
    e: React.MouseEvent,
    p: TacticalProjectSummary,
  ) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditingTitle(p.title);
  };

  const handleCommitRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingId) return;
    actions.handleCommitRename(editingId, editingTitle, () =>
      setEditingId(null),
    );
  };

  const handleDeleteItem = (e: React.MouseEvent, p: TacticalProjectSummary) => {
    actions.handleDelete(e, p, (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    );
  };

  const getItemProps = (p: TacticalProjectSummary) => ({
    project: p,
    isActive: p.id === currentProjectId,
    isSelected: selectedIds.has(p.id),
    isEditing: editingId === p.id,
    editingTitle,
    onSelect: actions.switchActiveProject,
    onToggleSelect: handleToggleSelect,
    onStartRename: handleStartRename,
    onCommitRename: handleCommitRename,
    onEditingTitleChange: setEditingTitle,
    onDuplicate: actions.handleDuplicate,
    onExportJson: actions.handleExportJson,
    onDelete: handleDeleteItem,
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProjectListToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredCount={filteredProjects.length}
        selectedCount={selectedIds.size}
        isAllSelected={isAllSelected}
        onSelectAll={handleSelectAll}
        isProcessingBulk={actions.isProcessingBulk}
        onBulkExport={() => actions.handleBulkExport(selectedIds)}
        onBulkDelete={() =>
          actions.handleBulkDelete(selectedIds, () => setSelectedIds(new Set()))
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#0f0f13]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-white/50 text-xs">
            <Loader2 size={24} className="animate-spin text-blue-400" />
            <span>プロジェクトを処理中...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/40 text-xs">
            <FolderKanban size={36} className="opacity-40" />
            <span>該当するプロジェクトがありません</span>
            <button
              type="button"
              onClick={onCreateClick}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              新しいプロジェクトを作成
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => (
              <ProjectCard key={p.id} {...getItemProps(p)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/10 bg-[#181820] overflow-hidden">
            {filteredProjects.map((p) => (
              <ProjectRow key={p.id} {...getItemProps(p)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
