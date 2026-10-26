'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cleanupOldCache, importMatchJsonFile } from '@/lib/data-loader';

export function useMatchCacheRecovery(onSuccess?: () => void) {
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    cleanupOldCache();
  }, []);

  const handleRestoreCache = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsRestoring(true);
      const toastId = toast.loading('Restoring match cache...', {
        description: 'Importing JSON and saving to database.',
      });

      try {
        await importMatchJsonFile(file);
        toast.success('Cache restored successfully!', { id: toastId });
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.reload();
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Restore failed: ${message}`, { id: toastId });
      } finally {
        setIsRestoring(false);
        if (restoreInputRef.current) {
          restoreInputRef.current.value = '';
        }
      }
    },
    [onSuccess],
  );

  return { isRestoring, restoreInputRef, handleRestoreCache };
}
