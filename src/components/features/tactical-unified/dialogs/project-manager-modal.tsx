'use client';

/**
 * project-manager-modal.tsx
 *
 * Tactical Projects Manager Dialog:
 *  - Project list & grid view with thumbnails, slide counts, last updated
 *  - Switch active project (instant load into unified store)
 *  - Create new blank project
 *  - Inline rename project title
 *  - Duplicate project
 *  - Single & Bulk project deletion (with safety checks)
 *  - Single JSON export & Bulk ZIP export
 *  - Multi-file JSON & ZIP import
 *  - Selection mode with "Select All" / "Deselect All"
 */

import {
  Archive,
  Check,
  CheckSquare,
  Clock,
  Copy,
  Download,
  Edit2,
  FilePlus2,
  FolderKanban,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  createNewTacticalProject,
  deleteTacticalProject,
  deleteTacticalProjects,
  duplicateTacticalProject,
  exportTacticalProjectsAsZip,
  exportTacticalProjectToJson,
  getTacticalProjectById,
  importMultipleTacticalProjects,
  listTacticalProjects,
  renameTacticalProject,
  saveTacticalProject,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { saveActiveProjectToDb } from '@/lib/tactical/tactical-storage';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectManagerModal({
  isOpen,
  onClose,
}: ProjectManagerModalProps) {
  const currentProject = useTacticalUnifiedStore((s) => s.project);
  const isDirty = useTacticalUnifiedStore((s) => s.isDirty);
  const loadProject = useTacticalUnifiedStore((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStore((s) => s.setSaveStatus);

  const [projects, setProjects] = useState<TacticalProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load project list on open
  useEffect(() => {
    if (!isOpen) return;

    async function fetchList() {
      setIsLoading(true);
      try {
        // Ensure current project is saved first
        if (currentProject?.id) {
          await saveTacticalProject(currentProject, true);
        }
        const list = await listTacticalProjects();
        setProjects(list);
      } catch (err) {
        console.error('Failed to load projects:', err);
        toast.error('プロジェクト一覧の読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    }

    fetchList();
    setSelectedIds(new Set());
  }, [isOpen, currentProject]);

  if (!isOpen) return null;

  const refreshList = async () => {
    try {
      const list = await listTacticalProjects();
      setProjects(list);
    } catch (err) {
      console.error('Failed to refresh project list:', err);
    }
  };

  // Toggle selection
  const handleToggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredProjects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProjects.map((p) => p.id)));
    }
  };

  // Switch to selected project
  const handleSelectProject = async (id: string) => {
    if (id === currentProject.id) {
      onClose();
      return;
    }

    try {
      // Save current project if dirty
      if (isDirty) {
        await saveActiveProjectToDb(currentProject);
      }

      const fullProject = await getTacticalProjectById(id);
      if (!fullProject) {
        toast.error('プロジェクトが見つかりませんでした');
        return;
      }

      await saveActiveProjectToDb(fullProject);
      loadProject(fullProject);
      setSaveStatus('saved');
      toast.success(
        `「${fullProject.title || 'Untitled Project'}」を読み込みました`,
      );
      onClose();
    } catch (err) {
      console.error('Failed to load selected project:', err);
      toast.error('プロジェクトの切り替えに失敗しました');
    }
  };

  // Create new project
  const handleCreateNew = async () => {
    try {
      const newProj = await createNewTacticalProject(
        '新規戦術プロジェクト',
        true,
      );
      loadProject(newProj);
      setSaveStatus('saved');
      toast.success('新しいプロジェクトを作成しました');
      onClose();
    } catch (err) {
      console.error('Failed to create project:', err);
      toast.error('新規プロジェクトの作成に失敗しました');
    }
  };

  // Start rename
  const handleStartRename = (
    e: React.MouseEvent,
    project: TacticalProjectSummary,
  ) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditingTitle(project.title);
  };

  // Commit rename
  const handleCommitRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingId) return;

    const trimmed = editingTitle.trim() || 'Untitled Project';
    try {
      await renameTacticalProject(editingId, trimmed);
      if (currentProject.id === editingId) {
        useTacticalUnifiedStore.getState().setTitle(trimmed);
      }
      setEditingId(null);
      await refreshList();
      toast.success('プロジェクト名を変更しました');
    } catch (err) {
      console.error('Failed to rename project:', err);
      toast.error('名前の変更に失敗しました');
    }
  };

  // Duplicate
  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const cloned = await duplicateTacticalProject(id);
      await refreshList();
      toast.success(`「${cloned.title}」を作成しました`);
    } catch (err) {
      console.error('Failed to duplicate project:', err);
      toast.error('プロジェクトの複製に失敗しました');
    }
  };

  // Single Delete
  const handleDelete = async (
    e: React.MouseEvent,
    project: TacticalProjectSummary,
  ) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `プロジェクト「${project.title}」を削除しますか？\n（この操作は取り消せません）`,
    );
    if (!confirmed) return;

    try {
      await deleteTacticalProject(project.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(project.id);
        return next;
      });
      toast.success('プロジェクトを削除しました');

      // If active project was deleted, switch to remaining or create default
      if (currentProject.id === project.id) {
        const remaining = await listTacticalProjects();
        if (remaining.length > 0) {
          const next = await getTacticalProjectById(remaining[0].id);
          if (next) {
            await saveActiveProjectToDb(next);
            loadProject(next);
          }
        } else {
          const newProj = await createNewTacticalProject(
            '新規戦術プロジェクト',
            true,
          );
          loadProject(newProj);
        }
      }

      await refreshList();
    } catch (err) {
      console.error('Failed to delete project:', err);
      toast.error('プロジェクトの削除に失敗しました');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (count === 0) return;

    const confirmed = window.confirm(
      `選択した ${count} 件のプロジェクトを削除しますか？\n（この操作は取り消せません）`,
    );
    if (!confirmed) return;

    setIsProcessingBulk(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      await deleteTacticalProjects(idsToDelete);
      setSelectedIds(new Set());
      toast.success(`${count} 件のプロジェクトを削除しました`);

      // If active project was deleted, switch or reset
      if (idsToDelete.includes(currentProject.id)) {
        const remaining = await listTacticalProjects();
        if (remaining.length > 0) {
          const next = await getTacticalProjectById(remaining[0].id);
          if (next) {
            await saveActiveProjectToDb(next);
            loadProject(next);
          }
        } else {
          const newProj = await createNewTacticalProject(
            '新規戦術プロジェクト',
            true,
          );
          loadProject(newProj);
        }
      }

      await refreshList();
    } catch (err) {
      console.error('Failed to bulk delete projects:', err);
      toast.error('一括削除に失敗しました');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Single JSON Export
  const handleExportJson = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      const full = await getTacticalProjectById(id);
      if (!full) {
        toast.error('プロジェクトデータが見つかりません');
        return;
      }
      exportTacticalProjectToJson(full);
      toast.success('JSONファイルを書き出しました');
    } catch (err) {
      console.error('Failed to export project JSON:', err);
      toast.error('JSON書き出しに失敗しました');
    }
  };

  // Bulk Export (ZIP archive of JSON files)
  const handleBulkExport = async () => {
    const idsToExport = Array.from(selectedIds);
    if (idsToExport.length === 0) return;

    setIsProcessingBulk(true);
    try {
      await exportTacticalProjectsAsZip(idsToExport);
      toast.success(
        `${idsToExport.length} 件のプロジェクトをZIPで書き出しました`,
      );
    } catch (err: any) {
      console.error('Failed to bulk export projects:', err);
      toast.error(err.message || '一括エクスポートに失敗しました');
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Multi-file JSON or ZIP Import
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      const { imported, errors } = await importMultipleTacticalProjects(files);
      await refreshList();

      if (imported.length > 0) {
        toast.success(`${imported.length} 件のプロジェクトを読み込みました`);
      }
      if (errors.length > 0) {
        toast.error(`一部の読み込みでエラーが発生しました: ${errors[0]}`);
      }
    } catch (err: any) {
      console.error('Failed to import project files:', err);
      toast.error(err.message || 'インポートに失敗しました');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const hasSelection = selectedIds.size > 0;
  const isAllSelected =
    filteredProjects.length > 0 && selectedIds.size === filteredProjects.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-4xl h-[85vh] max-h-[720px] bg-[#141418] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white select-none">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#191920]/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FolderKanban size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                戦術プロジェクト管理
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                  {projects.length} 件
                </span>
              </h2>
              <p className="text-xs text-white/50">
                保存済みプロジェクトの管理・切り替え・複製・一括操作
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Project Button */}
            <button
              type="button"
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <FilePlus2 size={14} />
              <span>新規作成</span>
            </button>

            {/* Multi Import Button (supports multiple JSON files or ZIP) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              title="戦術プロジェクトJSON（単数/複数）またはZIPファイルを読み込んで復元"
            >
              <Upload size={14} className="text-purple-400" />
              <span>JSON / ZIP 読込</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.zip,application/json,application/zip"
              multiple
              className="hidden"
              onChange={handleFileImport}
            />

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Bulk Action Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 bg-[#121216] gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="プロジェクト名で検索..."
              className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-white/40 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Center / Right: Selection Actions & View Toggle */}
          <div className="flex items-center gap-2">
            {/* Select All Button */}
            {filteredProjects.length > 0 && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs transition-colors cursor-pointer"
                title={
                  isAllSelected
                    ? '全選択を解除'
                    : '表示中のプロジェクトを全選択'
                }
              >
                {isAllSelected ? (
                  <CheckSquare size={13} className="text-blue-400" />
                ) : (
                  <Square size={13} />
                )}
                <span className="hidden sm:inline">
                  {isAllSelected ? '全解除' : '全選択'}
                </span>
              </button>
            )}

            {/* Bulk Action Buttons (Visible when items selected) */}
            {hasSelection && (
              <div className="flex items-center gap-1.5 animate-in fade-in duration-100 bg-blue-950/40 px-2 py-1 rounded-lg border border-blue-500/30">
                <span className="text-xs font-semibold text-blue-300 mr-1">
                  {selectedIds.size} 件選択中
                </span>

                {/* Bulk Export ZIP */}
                <button
                  type="button"
                  onClick={handleBulkExport}
                  disabled={isProcessingBulk}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="選択したプロジェクトをZIPにまとめてエクスポート"
                >
                  <Archive size={12} />
                  <span>一括Export (ZIP)</span>
                </button>

                {/* Bulk Delete */}
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isProcessingBulk}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                  title="選択したプロジェクトを一括削除"
                >
                  <Trash2 size={12} />
                  <span>一括削除</span>
                </button>
              </div>
            )}

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
                title="グリッド表示"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-white/50 hover:text-white'
                }`}
                title="リスト表示"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
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
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-blue-400 hover:underline cursor-pointer"
                >
                  検索フィルターをクリア
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((p) => {
                const isActive = p.id === currentProject.id;
                const isEditing = editingId === p.id;
                const isSelected = selectedIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProject(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectProject(p.id);
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
                        {/* Selection Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(e, p.id)}
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
                          {p.aspectRatio}
                        </span>
                      </div>

                      {/* Card Action Icons (Always Visible) */}
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleStartRename(e, p)}
                          className="p-1.5 rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                          title="名前を変更"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDuplicate(e, p.id)}
                          className="p-1.5 rounded hover:bg-purple-500/20 text-white/70 hover:text-purple-300 transition-colors cursor-pointer"
                          title="プロジェクトを複製"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleExportJson(e, p.id)}
                          className="p-1.5 rounded hover:bg-blue-500/20 text-white/70 hover:text-blue-300 transition-colors cursor-pointer"
                          title="プロジェクトをJSONファイルとしてダウンロード保存"
                        >
                          <Download size={13} className="text-blue-400" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, p)}
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
                        <form
                          onSubmit={handleCommitRename}
                          className="flex items-center gap-1"
                        >
                          <input
                            ref={(el) => el?.focus()}
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => handleCommitRename()}
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
                          title={p.title}
                        >
                          {p.title}
                        </h3>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center justify-between text-[10px] text-white/50 border-t border-white/5 pt-2 mt-auto">
                      <span className="flex items-center gap-1">
                        <Layers size={11} className="text-blue-400" />
                        <span>{p.slideCount} スライド</span>
                      </span>

                      <span
                        className="flex items-center gap-1"
                        title={p.updatedAt}
                      >
                        <Clock size={11} className="text-white/40" />
                        <span>{formatDate(p.updatedAt)}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="flex flex-col divide-y divide-white/5 rounded-xl border border-white/10 bg-[#181820] overflow-hidden">
              {filteredProjects.map((p) => {
                const isActive = p.id === currentProject.id;
                const isEditing = editingId === p.id;
                const isSelected = selectedIds.has(p.id);

                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectProject(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectProject(p.id);
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
                        onClick={(e) => handleToggleSelect(e, p.id)}
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

                      <div className="p-2 rounded-lg bg-white/5 text-white/60 shrink-0">
                        <FolderKanban size={16} />
                      </div>

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <form
                            onSubmit={handleCommitRename}
                            className="flex items-center gap-1 max-w-sm"
                          >
                            <input
                              ref={(el) => el?.focus()}
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onBlur={() => handleCommitRename()}
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
                              {p.title}
                            </span>
                            {isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                編集中
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5 font-mono">
                          <span>{p.aspectRatio}</span>
                          <span>•</span>
                          <span>{p.slideCount} スライド</span>
                          <span>•</span>
                          <span>更新: {formatDate(p.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions (Always Visible) */}
                    <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/10 shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={(e) => handleStartRename(e, p)}
                        className="p-1.5 rounded hover:bg-white/15 text-white/70 hover:text-white transition-colors cursor-pointer"
                        title="名前を変更"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDuplicate(e, p.id)}
                        className="p-1.5 rounded hover:bg-purple-500/20 text-white/70 hover:text-purple-300 transition-colors cursor-pointer"
                        title="プロジェクトを複製"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleExportJson(e, p.id)}
                        className="p-1.5 rounded hover:bg-blue-500/20 text-white/70 hover:text-blue-300 transition-colors cursor-pointer"
                        title="プロジェクトをJSONファイルとしてダウンロード保存"
                      >
                        <Download size={13} className="text-blue-400" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, p)}
                        className="p-1.5 rounded hover:bg-rose-500/20 text-white/70 hover:text-rose-400 transition-colors cursor-pointer"
                        title="プロジェクトを削除"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-[#191920]/80 text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-blue-400 shrink-0" />
            <span>
              各プロジェクトの{' '}
              <Download size={11} className="inline text-blue-400 mx-0.5" />{' '}
              アイコン、またはチェックボックスで選択して「一括Export
              (ZIP)」からバックアップできます
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer shrink-0 ml-4"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
