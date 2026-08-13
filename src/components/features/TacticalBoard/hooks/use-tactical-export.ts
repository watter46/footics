import { toBlob } from 'html-to-image';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export function useTacticalExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportPitchImage = useCallback(
    async (element: HTMLElement | null, _matchId?: string) => {
      if (!element) {
        toast.error('ピッチ領域が見つかりませんでした');
        return;
      }

      setIsExporting(true);
      const toastId = toast.loading('画像をクリップボードにコピー中...');

      try {
        if (!navigator.clipboard?.write) {
          throw new Error(
            'お使いのブラウザは画像のクリップボードコピーに対応していません',
          );
        }

        const generateBlob = async (): Promise<Blob> => {
          // ブラウザの表示幅に依存せず、常にフルHD解像度 (横幅1920px) で出力するよう比率を動的計算
          const rect = element.getBoundingClientRect();
          const targetWidth = 1920;
          const dynamicPixelRatio =
            rect.width > 0 ? Math.max(2, targetWidth / rect.width) : 2.5;

          const blob = await toBlob(element, {
            quality: 1.0,
            pixelRatio: dynamicPixelRatio, // ブラウザの大きさに左右されず常に高解像度出力
            backgroundColor: '#020617', // ピッチ背景色
            cacheBust: false, // CORS/fetchエラー防止
            style: {
              textRendering: 'geometricPrecision',
            },
            filter: (node) => {
              if (!(node instanceof HTMLElement)) return true;
              if (node.dataset.noCapture) return false;
              if (
                node.id === 'tactical-floating-palette' ||
                node.classList.contains('tdc-floating-palette') ||
                node.classList.contains('tlui-style-panel') ||
                node.classList.contains('tlui-popover') ||
                node.classList.contains('tlui-menu-zone') ||
                node.classList.contains('tlui-quick-actions') ||
                node.classList.contains('tl-watermark_SEE-LICENSE')
              ) {
                return false;
              }
              return true;
            },
          });

          if (!blob) {
            throw new Error('画像の生成に失敗しました');
          }
          return blob;
        };

        // ブラウザの非同期権限タイムアウトを回避するため Promise を渡す
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': generateBlob(),
            }),
          ]);
        } catch {
          // 古いブラウザ / 非同期Promise非対応環境向けのフォールバック
          const resolvedBlob = await generateBlob();
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': resolvedBlob,
            }),
          ]);
        }

        toast.success('ピッチ画像をクリップボードにコピーしました', {
          id: toastId,
        });
      } catch (err) {
        console.error('Failed to copy tactical pitch image:', err);
        const errorMsg =
          err instanceof Error
            ? err.message
            : 'クリップボードへのアクセス権限をご確認ください';
        toast.error(`画像のコピーに失敗しました: ${errorMsg}`, { id: toastId });
      } finally {
        setIsExporting(false);
      }
    },
    [],
  );

  return { exportPitchImage, isExporting };
}
