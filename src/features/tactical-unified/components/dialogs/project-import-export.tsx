'use client';

import { Archive, Download, FileArchive, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import {
  importMultipleTacticalProjects,
  type TacticalProjectSummary,
} from '@/lib/db/tactical-projects-db';
import {
  exportProjectsZip,
  exportSingleProjectJson,
} from './project-dialog-utils';

export interface ProjectImportExportProps {
  projects: TacticalProjectSummary[];
  onImportCompleted: () => Promise<void>;
}

export function ProjectImportExport({
  projects,
  onImportCompleted,
}: ProjectImportExportProps) {
  const currentProjectId = useTacticalUnifiedStore((s) => s.project.id);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    try {
      const { imported, errors } = await importMultipleTacticalProjects(files);
      await onImportCompleted();
      if (imported.length > 0) {
        toast.success(`${imported.length} 件のプロジェクトを読み込みました`);
      }
      if (errors.length > 0) {
        toast.error(`一部の読み込みでエラーが発生しました: ${errors[0]}`);
      }
    } catch (err: unknown) {
      console.error('Failed to import project files:', err);
      toast.error(
        err instanceof Error ? err.message : 'インポートに失敗しました',
      );
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportAllZip = async () => {
    if (projects.length === 0)
      return toast.info('エクスポート可能なプロジェクトがありません');
    setIsExporting(true);
    try {
      await exportProjectsZip(projects.map((p) => p.id));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 p-6 overflow-y-auto space-y-6">
      {/* Import Section */}
      <div className="bg-[#181820] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Upload size={16} className="text-purple-400" />
          <span>プロジェクトの復元・インポート (JSON / ZIP)</span>
        </div>
        <p className="text-xs text-white/60">
          バックアップした単一または複数のプロジェクト JSON ファイル、または一括
          ZIP ファイルをインポートできます。
        </p>

        <div
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          className="border-2 border-dashed border-white/15 hover:border-purple-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-purple-500/[0.04] transition-colors"
        >
          {isImporting ? (
            <Loader2 size={24} className="animate-spin text-purple-400" />
          ) : (
            <FileArchive size={28} className="text-purple-400/80" />
          )}
          <span className="text-xs font-medium text-white/80">
            {isImporting
              ? 'インポート処理中...'
              : 'ファイルを選択するかドラッグ＆ドロップ'}
          </span>
          <span className="text-[10px] text-white/40">
            .json または .zip 形式に対応
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip,application/json,application/zip"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-[#181820] border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Download size={16} className="text-blue-400" />
          <span>バックアップ・エクスポート</span>
        </div>
        <p className="text-xs text-white/60">
          プロジェクトデータを安全にローカルへダウンロードして保管します。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleExportAllZip}
            disabled={isExporting || projects.length === 0}
            className="flex items-center justify-center gap-2 p-3.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
          >
            <Archive size={15} />
            <span>
              全プロジェクトを一括バックアップ (ZIP) ({projects.length}件)
            </span>
          </button>

          <button
            type="button"
            onClick={() => exportSingleProjectJson(currentProjectId)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>編集中プロジェクトのみ書き出し (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
