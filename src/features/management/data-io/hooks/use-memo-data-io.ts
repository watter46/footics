import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { exportMemosAsJson, importMemosFromJson } from '@/lib/db';

export function useMemoDataIO(matchId: string, onRefresh?: () => void) {
  const memoFileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const openMemoFileDialog = () => {
    memoFileInputRef.current?.click();
  };

  const handleExportMemos = async () => {
    try {
      setIsExporting(true);
      await exportMemosAsJson(matchId);
      toast.success('Memos exported successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to export memos: ${message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportMemos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const count = await importMemosFromJson(file, matchId);
      toast.success(`${count} memos imported successfully`);
      onRefresh?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to import memos: ${message}`);
    } finally {
      setIsImporting(false);
      if (memoFileInputRef.current) memoFileInputRef.current.value = '';
    }
  };

  return {
    memoFileInputRef,
    isExporting,
    isImporting,
    openMemoFileDialog,
    handleExportMemos,
    handleImportMemos,
  };
}
