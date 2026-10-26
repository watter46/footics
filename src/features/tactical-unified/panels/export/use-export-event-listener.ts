'use client';

import { useEffect, useState } from 'react';

export function useExportEventListener() {
  const [completedVideo, setCompletedVideo] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    const onComp = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        blob: Blob;
        filename: string;
      };
      if (detail?.blob) {
        setExportError(null);
        setCompletedVideo(detail);
      }
    };
    const onErr = (e: Event) => {
      const detail = (e as CustomEvent).detail as { error: string };
      setExportError(detail?.error || 'Video export failed. Please try again.');
    };
    window.addEventListener('tactical:export-completed', onComp);
    window.addEventListener('tactical:export-error', onErr);
    return () => {
      window.removeEventListener('tactical:export-completed', onComp);
      window.removeEventListener('tactical:export-error', onErr);
    };
  }, []);

  return { completedVideo, setCompletedVideo, exportError, setExportError };
}
