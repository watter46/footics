'use client';

import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  listTacticalProjects,
  saveTacticalProject,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import { ProjectCreateForm } from './project-create-form';
import { ProjectImportExport } from './project-import-export';
import { ProjectListView } from './project-list-view';
import { type ModalView, ProjectModalHeader } from './project-modal-header';

export interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectManagerModal({
  isOpen,
  onClose,
}: ProjectManagerModalProps) {
  const currentProject = useTacticalUnifiedStore((s) => s.project);
  const [projects, setProjects] = useState<TacticalProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState<ModalView>('list');

  const refreshList = async () => {
    try {
      setProjects(await listTacticalProjects());
    } catch {
      toast.error('プロジェクト一覧の読み込みに失敗しました');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setView('list');
    (async () => {
      setIsLoading(true);
      try {
        if (currentProject?.id) await saveTacticalProject(currentProject, true);
        await refreshList();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isOpen, currentProject]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="flex flex-col w-full max-w-4xl h-[85vh] max-h-[720px] bg-[#141418] border border-white/15 rounded-2xl shadow-2xl overflow-hidden text-white">
        <ProjectModalHeader
          projectCount={projects.length}
          view={view}
          onViewChange={setView}
          onClose={onClose}
        />

        {view === 'list' && (
          <ProjectListView
            projects={projects}
            isLoading={isLoading}
            onRefresh={refreshList}
            onClose={onClose}
            onCreateClick={() => setView('create')}
          />
        )}
        {view === 'create' && (
          <ProjectCreateForm
            onCancel={() => setView('list')}
            onCreated={() => {
              refreshList();
              onClose();
            }}
          />
        )}
        {view === 'import-export' && (
          <ProjectImportExport
            projects={projects}
            onImportCompleted={refreshList}
          />
        )}

        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-[#191920]/80 text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-blue-400 shrink-0" />
            <span>
              戦術プロジェクトの保存・復元・アスペクト比設定を管理できます
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer ml-4"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
