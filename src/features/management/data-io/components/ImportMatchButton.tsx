'use client';

import { Database, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
      <Button
        variant="secondary"
        size="sm"
        onClick={openFileDialog}
        disabled={isLoading}
        icon={
          isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400 shrink-0" />
          ) : (
            <Database className="h-3.5 w-3.5 text-purple-400 shrink-0" />
          )
        }
        className="shrink-0"
      >
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
      </Button>

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
