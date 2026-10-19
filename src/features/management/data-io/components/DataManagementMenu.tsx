'use client';

import { Database, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { useState } from 'react';
import { useMatchDataImport } from '../hooks/use-match-data-import';
import { useMemoDataIO } from '../hooks/use-memo-data-io';

export interface DataManagementMenuProps {
  matchId: string;
  onRefresh: () => void;
}

export function DataManagementMenu({
  matchId,
  onRefresh,
}: DataManagementMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    fileInputRef: matchFilesRef,
    isLoading: isMatchLoading,
    openFileDialog: openMatchDialog,
    handleFileChange: handleImportMatches,
  } = useMatchDataImport();

  const {
    memoFileInputRef,
    openMemoFileDialog,
    handleExportMemos,
    handleImportMemos,
  } = useMemoDataIO(matchId, onRefresh);

  const isImporting = isMatchLoading;

  const onSelectMatchFiles = () => {
    setIsOpen(false);
    openMatchDialog();
  };

  const onSelectMemoFile = () => {
    setIsOpen(false);
    openMemoFileDialog();
  };

  const onExportMemos = async () => {
    await handleExportMemos();
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={isImporting}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-xs sm:text-sm font-medium text-slate-200 transition-all shadow-sm group disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
      >
        {isImporting ? (
          <Loader2 className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1 sm:mr-2 text-purple-400 animate-spin shrink-0" />
        ) : (
          <Database className="h-3.5 sm:h-4 w-3.5 sm:w-4 mr-1 sm:mr-2 text-purple-400 group-hover:text-purple-300 transition-colors shrink-0" />
        )}
        <span className="hidden xs:inline">
          {isImporting ? 'Importing...' : 'Data'}
        </span>
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
              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={onSelectMatchFiles}
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
              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={onSelectMemoFile}
              >
                <Upload className="mr-3 h-4 w-4 text-green-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                <span className="font-medium text-slate-200">Import Memos</span>
              </button>

              <button
                type="button"
                className="flex items-center w-full px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors group"
                onClick={onExportMemos}
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
        ref={memoFileInputRef}
        accept=".json"
        className="hidden"
        id="memo-json-import"
        onChange={async (e) => {
          await handleImportMemos(e);
          setIsOpen(false);
        }}
      />
    </div>
  );
}
