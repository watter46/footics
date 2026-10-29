'use client';

import { Archive, Download, FileArchive, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
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
  const currentProjectId = useTacticalUnifiedStoreContext((s) => s.project.id);
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
      <div className="bg-[#18181B] border border-white/[0.08] rounded-[10px] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Upload size={16} className="text-[#60A5FA]" />
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
          className="border-2 border-dashed border-white/[0.08] hover:border-[#60A5FA]/50 rounded-[10px] p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-[#60A5FA]/[0.04] transition-colors"
        >
          {isImporting ? (
            <Loader2 size={24} className="animate-spin text-[#60A5FA]" />
          ) : (
            <FileArchive size={28} className="text-[#60A5FA]/80" />
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
      <div className="bg-[#18181B] border border-white/[0.08] rounded-[10px] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Download size={16} className="text-[#60A5FA]" />
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
            className="flex items-center justify-center gap-2 p-3.5 rounded-[8px] bg-[#60A5FA]/15 hover:bg-[#60A5FA]/25 border border-[#60A5FA]/30 text-[#60A5FA] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
          >
            <Archive size={15} />
            <span>
              全プロジェクトを一括バックアップ (ZIP) ({projects.length}件)
            </span>
          </button>

          <button
            type="button"
            onClick={() => exportSingleProjectJson(currentProjectId)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-[8px] bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/80 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download size={15} />
            <span>編集中プロジェクトのみ書き出し (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
