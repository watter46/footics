'use client';

import { Archive, Database, RefreshCw, Settings, Upload } from 'lucide-react';
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
import { useGlobalDataBackup } from '../hooks/use-global-data-backup';

export function GlobalDataManagement() {
  const {
    backupFileInputRef,
    isProcessing,
    openBackupFileDialog,
    handleExportBackup,
    handleImportBackup,
  } = useGlobalDataBackup();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              size="sm"
              icon={<Database className="w-3.5 h-3.5" />}
              className="font-semibold gap-1.5 shrink-0"
            >
              <span className="hidden sm:inline">Global Data</span>
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              <span>Data Management</span>
            </DropdownMenuLabel>

            <DropdownMenuItem
              disabled={isProcessing}
              onClick={() => void handleExportBackup()}
            >
              <Archive className="h-4 w-4 text-amber-400 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-medium text-white">
                  Full Backup (.zip)
                </span>
                <span className="text-[10px] text-white/50">
                  Export matches, memos, and events
                </span>
              </div>
              {isProcessing && (
                <RefreshCw className="ml-auto w-3.5 h-3.5 animate-spin opacity-50" />
              )}
            </DropdownMenuItem>

            <DropdownMenuItem
              disabled={isProcessing}
              onClick={openBackupFileDialog}
            >
              <Upload className="h-4 w-4 text-blue-400 shrink-0" />
              <div className="flex flex-col items-start leading-tight">
                <span className="font-medium text-white">Restore Data</span>
                <span className="text-[10px] text-white/50">
                  Merge from existing backup ZIP
                </span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <div className="px-2.5 py-1.5">
            <p className="text-[10px] text-white/40 italic">
              Matches are merged by ID. Existing memos will be updated.
            </p>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden input for ZIP file */}
      <input
        type="file"
        ref={backupFileInputRef}
        accept=".zip"
        className="hidden"
        onChange={handleImportBackup}
      />
    </>
  );
}
