'use client';

import { Database, Download, FileUp, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/menu';
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="sm"
              disabled={isImporting}
              icon={
                isImporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400 shrink-0" />
                ) : (
                  <Database className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                )
              }
              className="shrink-0"
            >
              <span className="hidden xs:inline">
                {isImporting ? 'Importing...' : 'Data'}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Match Data</DropdownMenuLabel>
            <DropdownMenuItem onClick={openMatchDialog}>
              <FileUp className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-medium text-white">Import Matches</span>
                <span className="text-[10px] text-white/50">
                  Select one or multiple JSON files
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            <DropdownMenuLabel>Match Memos</DropdownMenuLabel>
            <DropdownMenuItem onClick={openMemoFileDialog}>
              <Upload className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="font-medium text-white">Import Memos</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => void handleExportMemos()}>
              <Download className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="font-medium text-white">Export Memos</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

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
        onChange={handleImportMemos}
      />
    </>
  );
}
