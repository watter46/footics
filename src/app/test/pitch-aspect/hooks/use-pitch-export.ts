import { type RefObject, useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { BoundaryAspectRatio } from '../pitch-constants';

interface UsePitchExportOptions {
  exportRef: RefObject<HTMLDivElement | null>;
  boundaryAspect: BoundaryAspectRatio;
}

async function domToBlob(element: HTMLElement): Promise<Blob | null> {
  const svg = element.querySelector('svg');
  if (!svg) return null;

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = (element.clientWidth || 800) * 2;
  canvas.height = (element.clientHeight || 450) * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    return null;
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
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
      const blob = await domToBlob(exportRef.current);
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
      const blob = await domToBlob(exportRef.current);
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
