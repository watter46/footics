'use client';

import { Database, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { importMatchesBatch } from '@/lib/data-loader';
import { exportMemosAsJson, importMemosFromJson } from '@/lib/db';

interface DataManagementMenuProps {
  matchId: string;
  onRefresh: () => void;
}

export function DataManagementMenu({
  matchId,
  onRefresh,
}: DataManagementMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const matchFilesRef = useRef<HTMLInputElement>(null);
  const memoFileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────

  /**
   * Whoscored JSON ファイルを複数選択して一括インポートする。
   * 進捗を toast で逐次表示し、完了後にページをリロードする。
   */
  const handleImportMatches = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setIsOpen(false);
    setIsImporting(true);
    const toastId = toast.loading(`Importing 0 / ${files.length} matches...`);

    try {
      const result = await importMatchesBatch(files, (current, total) => {
        toast.loading(`Importing ${current} / ${total} matches...`, {
          id: toastId,
        });
      });

      if (result.failed === 0) {
        toast.success(
          `${result.success} match${result.success !== 1 ? 'es' : ''} imported successfully!`,
          { id: toastId, duration: 4000 },
        );
      } else {
        const errorSummary = result.errors
          .map((e) => `• ${e.filename}: ${e.message}`)
          .join('\n');
        toast.warning(
          `${result.success} succeeded, ${result.failed} failed.\n${errorSummary}`,
          { id: toastId, duration: 8000 },
        );
      }

      // Reload so the match list reflects the newly imported matches
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Import failed: ${message}`, { id: toastId });
    } finally {
      setIsImporting(false);
      if (matchFilesRef.current) matchFilesRef.current.value = '';
    }
  };

  const handleExportMemos = async () => {
    try {
      await exportMemosAsJson(matchId);
      toast.success('Memos exported successfully');
      setIsOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to export memos: ${message}`);
    }
  };

  const handleImportMemos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const count = await importMemosFromJson(file, matchId);
      toast.success(`${count} memos imported successfully`);
      onRefresh();
      setIsOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to import memos: ${message}`);
    } finally {
      if (memoFileRef.current) memoFileRef.current.value = '';
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        disabled={isImporting}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isImporting ? (
          <Loader2 className="h-4 w-4 mr-2 text-purple-400 animate-spin" />
        ) : (
          <Database className="h-4 w-4 mr-2 text-purple-400 group-hover:text-purple-300 transition-colors" />
        )}
        {isImporting ? 'Importing...' : 'Data'}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-60 rounded-xl shadow-2xl bg-slate-900 border border-slate-700/60 z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-800/40">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Match Data
              </h3>
            </div>

            <div className="p-1.5 flex flex-col gap-0.5">
              {/* Import Matches (multi-select) */}
              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={() => matchFilesRef.current?.click()}
              >
                <FileUp className="mr-3 h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <div className="flex flex-col items-start leading-tight">
                  <span className="font-medium text-slate-200">
                    Import Matches
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Select one or multiple JSON files
                  </span>
                </div>
              </button>
            </div>

            <div className="px-4 py-2 border-t border-slate-800 bg-slate-800/20">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Match Memos
              </h3>
            </div>

            <div className="p-1.5 flex flex-col gap-0.5">
              {/* Import Memos */}
              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={() => memoFileRef.current?.click()}
              >
                <Upload className="mr-3 h-4 w-4 text-green-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="font-medium text-slate-200">Import Memos</span>
              </button>

              {/* Export Memos */}
              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={handleExportMemos}
              >
                <Download className="mr-3 h-4 w-4 text-orange-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="font-medium text-slate-200">Export Memos</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={matchFilesRef}
        accept=".json"
        multiple
        className="hidden"
        id="match-json-import"
        onChange={handleImportMatches}
      />
      <input
        type="file"
        ref={memoFileRef}
        accept=".json"
        className="hidden"
        id="memo-json-import"
        onChange={handleImportMemos}
      />
    </div>
  );
}
