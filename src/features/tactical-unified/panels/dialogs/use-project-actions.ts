'use client';

import type React from 'react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  getTacticalProjectById,
  type TacticalProjectSummary,
} from '@/lib/tactical/tactical-projects-service';
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
  const currentProject = useDocumentStore((s) => s.project);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const setActivePhaseId = useSessionStore((s) => s.setActivePhaseId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);
  const setSaveStatus = useSessionStore((s) => s.setSaveStatus);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const applyLoadedProject = (rawProject: unknown) => {
    const bundle = normalizeTacticalProject(rawProject);
    loadProject(bundle.project);
    setActivePhaseId(bundle.activePhaseId);
    setActiveSlideId(bundle.activeSlideId);
    return bundle.project;
  };

  const setTitle = (title: string) => {
    dispatch({ type: 'UPDATE_PROJECT_META', patch: { title } });
  };

  const switchActiveProject = async (id: string) => {
    if (id === currentProject.id) return onClose();
    try {
      if (isDirty) await saveActiveProjectToDb(currentProject);
      const full = await getTacticalProjectById(id);
      if (!full) return toast.error('プロジェクトが見つかりませんでした');
      const domainProj = applyLoadedProject(full);
      await saveActiveProjectToDb(domainProj);
      setSaveStatus('saved');
      toast.success(
        `「${domainProj.title || 'Untitled Project'}」を読み込みました`,
      );
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
        applyLoadedProject,
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
        applyLoadedProject,
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
