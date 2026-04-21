'use client';

import { Database, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { importMatchesBatch } from '@/lib/data-loader';

export function ImportMatchButton() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

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
        window.location.reload();
      } else if (result.failed === 0) {
        toast.info('No matches were imported.');
      }

      if (result.failed > 0) {
        const errorSummary = result.errors
          .map((e) => `• ${e.filename}: ${e.message}`)
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
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={isLoading}
        className="flex items-center px-4 py-2 bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 hover:bg-slate-700 hover:border-slate-500 rounded-lg text-sm font-medium text-slate-200 transition-all shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed min-w-[140px]"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-400 font-bold" />
        ) : (
          <Database className="mr-2 h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
        )}
        <span className="truncate">
          {isLoading
            ? progress
              ? `${progress.current}/${progress.total}`
              : 'Importing...'
            : 'Data Import'}
        </span>
      </button>

      <input
        type="file"
        ref={fileRef}
        accept=".json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  );
}
