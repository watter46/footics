'use client';

import { toBlob } from 'html-to-image';
import { type RefObject, useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { BoundaryAspectRatio } from '../pitch-constants';

interface UsePitchExportOptions {
  exportRef: RefObject<HTMLDivElement | null>;
  boundaryAspect: BoundaryAspectRatio;
}

export function usePitchExport({
  exportRef,
  boundaryAspect,
}: UsePitchExportOptions) {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyPng = useCallback(async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const blob = await toBlob(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          if (node instanceof Element) {
            if (node.classList?.contains('no-export')) return false;
            if (node.getAttribute?.('class')?.includes('no-export'))
              return false;
          }
          return true;
        },
      });

      if (!blob) throw new Error('Blob generation failed');

      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        toast.success(
          `境界線（${boundaryAspect}）のPNG画像をクリップボードにコピーしました！`,
        );
        setTimeout(() => setCopied(false), 2500);
      } catch (_clipboardError) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `footics-pitch-${boundaryAspect.replace(':', '-')}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.info(
          'クリップボード書き込みが制限されているため、PNG画像ファイルをダウンロードしました。',
        );
      }
    } catch (err) {
      console.error('Failed to export PNG:', err);
      toast.error('PNG画像の生成に失敗しました。');
    } finally {
      setIsExporting(false);
    }
  }, [boundaryAspect, exportRef, isExporting]);

  const handleDownloadPng = useCallback(async () => {
    if (!exportRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const blob = await toBlob(exportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          if (node instanceof Element) {
            if (node.classList?.contains('no-export')) return false;
            if (node.getAttribute?.('class')?.includes('no-export'))
              return false;
          }
          return true;
        },
      });

      if (!blob) throw new Error('Blob generation failed');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `footics-pitch-${boundaryAspect.replace(':', '-')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `境界線（${boundaryAspect}）のPNG画像をダウンロードしました！`,
      );
    } catch (err) {
      console.error('Failed to download PNG:', err);
      toast.error('PNG画像のダウンロードに失敗しました。');
    } finally {
      setIsExporting(false);
    }
  }, [boundaryAspect, exportRef, isExporting]);

  return {
    isExporting,
    copied,
    handleCopyPng,
    handleDownloadPng,
  };
}
