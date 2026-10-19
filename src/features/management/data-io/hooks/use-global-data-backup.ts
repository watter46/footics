'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { exportAllDataZip, importAllDataZip } from '@/lib/data-management';

export function useGlobalDataBackup() {
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const openBackupFileDialog = () => {
    backupFileInputRef.current?.click();
  };

  const handleExportBackup = async () => {
    setIsProcessing(true);
    const toastId = toast.loading('Preparing backup file...', {
      description: 'Compressing all matches and memos into a ZIP archive.',
    });

    try {
      await exportAllDataZip();
      toast.success('Backup downloaded successfully!', { id: toastId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Export failed: ${message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading('Restoring data...', {
      description: 'Decoding archive and merging into IndexedDB.',
    });

    try {
      const result = await importAllDataZip(file);
      const photoInfo =
        result.photoCount > 0 ? `, ${result.photoCount} photos` : '';
      toast.success('Restore complete!', {
        id: toastId,
        description: `Successfully restored ${result.matchCount} matches, ${result.playerCount} players${photoInfo}, and ${result.memoCount} memos. Finalizing...`,
        duration: 3500,
      });

      // Give the browser a bit more time to flush to disk and the user to read the message
      setTimeout(() => {
        window.location.reload();
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Restore failed: ${message}`, { id: toastId });
    } finally {
      setIsProcessing(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  return {
    backupFileInputRef,
    isProcessing,
    openBackupFileDialog,
    handleExportBackup,
    handleImportBackup,
  };
}
