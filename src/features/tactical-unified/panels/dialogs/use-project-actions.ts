'use client';

import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  getTacticalProjectById,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { saveActiveProjectToDb } from '@/lib/tactical/tactical-storage';
import {
  bulkDeleteProjectsHelper,
  deleteProjectHelper,
  duplicateProjectHelper,
  exportProjectsZip,
  exportSingleProjectJson,
  renameProjectHelper,
} from './project-dialog-utils';

interface UseProjectActionsOptions {
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export function useProjectActions({
  onRefresh,
  onClose,
}: UseProjectActionsOptions) {
  const currentProject = useTacticalUnifiedStoreContext((s) => s.project);
  const isDirty = useTacticalUnifiedStoreContext((s) => s.isDirty);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);
  const setTitle = useTacticalUnifiedStoreContext((s) => s.setTitle);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const switchActiveProject = async (id: string) => {
    if (id === currentProject.id) return onClose();
    try {
      if (isDirty) await saveActiveProjectToDb(currentProject);
      const full = await getTacticalProjectById(id);
      if (!full) return toast.error('プロジェクトが見つかりませんでした');
      await saveActiveProjectToDb(full);
      loadProject(full);
      setSaveStatus('saved');
      toast.success(`「${full.title || 'Untitled Project'}」を読み込みました`);
      onClose();
    } catch (err) {
      console.error('Failed to switch project:', err);
      toast.error('プロジェクトの切り替えに失敗しました');
    }
  };

  const handleBulkDelete = async (ids: Set<string>, onClear: () => void) => {
    setIsProcessingBulk(true);
    try {
      await bulkDeleteProjectsHelper(
        ids,
        currentProject.id,
        loadProject,
        onClear,
        onRefresh,
      );
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleBulkExport = async (ids: Set<string>) => {
    setIsProcessingBulk(true);
    try {
      await exportProjectsZip(Array.from(ids));
    } finally {
      setIsProcessingBulk(false);
    }
  };

  return {
    isProcessingBulk,
    switchActiveProject,
    handleDuplicate: (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      duplicateProjectHelper(id, onRefresh);
    },
    handleCommitRename: (
      editingId: string,
      title: string,
      onDone: () => void,
    ) =>
      renameProjectHelper(
        editingId,
        title,
        currentProject.id,
        onDone,
        onRefresh,
        setTitle,
      ),
    handleDelete: (
      e: React.MouseEvent,
      p: TacticalProjectSummary,
      onDeselect: (id: string) => void,
    ) => {
      e.stopPropagation();
      deleteProjectHelper(
        p,
        currentProject.id,
        loadProject,
        onDeselect,
        onRefresh,
      );
    },
    handleBulkDelete,
    handleExportJson: (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      exportSingleProjectJson(id);
    },
    handleBulkExport,
  };
}
