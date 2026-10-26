import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { importMatchesBatch } from '@/lib/data-loader';

export interface UseMatchDataImportOptions {
  onSuccess?: (importedCount: number) => void;
}

export function useMatchDataImport(options: UseMatchDataImportOptions = {}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsLoading(true);

      const fileArray = Array.from(files);

      const result = await importMatchesBatch(fileArray, (current, total) => {
        setProgress({ current, total });
      });

      if (result.success > 0) {
        toast.success(`Imported ${result.success} matches!`);
        if (options.onSuccess) {
          options.onSuccess(result.success);
        } else {
          window.location.reload();
        }
      } else if (result.failed === 0) {
        toast.info('No matches were imported.');
      }

      if (result.failed > 0) {
        const errorSummary = result.errors
          .map((err) => `• ${err.filename}: ${err.message}`)
          .join('\n');
        toast.error(
          `Failed to import ${result.failed} matches.\n${errorSummary}`,
          { duration: 8000 },
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to import matches: ${message}`);
    } finally {
      setIsLoading(false);
      setProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return {
    fileInputRef,
    isLoading,
    progress,
    openFileDialog,
    handleFileChange,
  };
}
