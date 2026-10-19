'use client';

import { Database, Loader2 } from 'lucide-react';
import { useMatchDataImport } from '../hooks/use-match-data-import';

export function ImportMatchButton() {
  const {
    fileInputRef,
    isLoading,
    progress,
    openFileDialog,
    handleFileChange,
  } = useMatchDataImport();

  return (
    <>
      <button
        type="button"
        onClick={openFileDialog}
        disabled={isLoading}
        className="flex items-center px-2.5 sm:px-4 py-1.5 sm:py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-xl sm:rounded-lg text-xs sm:text-sm font-medium text-slate-200 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
      >
        {isLoading ? (
          <Loader2 className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin text-blue-400 font-bold shrink-0" />
        ) : (
          <Database className="mr-1.5 sm:mr-2 h-3.5 sm:h-4 w-3.5 sm:w-4 text-purple-400 group-hover:text-purple-300 transition-colors shrink-0" />
        )}
        <span className="truncate">
          {isLoading ? (
            progress ? (
              `${progress.current}/${progress.total}`
            ) : (
              'Importing...'
            )
          ) : (
            <>
              <span className="hidden sm:inline">Data Import</span>
              <span className="sm:hidden">Import</span>
            </>
          )}
        </span>
      </button>

      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
