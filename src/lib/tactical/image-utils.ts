/**
 * 画像のリサイズおよび正方形センタートリミングユーティリティ
 */

/**
 * 任意の画像 (File または Blob) を 256x256 (デフォルト) の正方形 Blob にリサイズ・センタートリミングする。
 *
 * @param fileOrBlob 入力画像 File / Blob
 * @param size 出力画像の 1 辺のピクセル数 (デフォルト: 256)
 * @param mimeType 出力画像 MIME タイプ (デフォルト: 'image/png')
 * @returns トリミング・リサイズ済みの Blob
 */
export async function resizeAndCropImageToBlob(
  fileOrBlob: Blob | File,
  size = 256,
  mimeType = 'image/png',
): Promise<Blob> {
  if (typeof window === 'undefined') {
    return fileOrBlob;
  }

  // createImageBitmap が利用可能な場合は高速パスを使用
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(fileOrBlob);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        bitmap.close();
        throw new Error('Canvas 2D context is not available');
      }

      const { width, height } = bitmap;
      const minDim = Math.min(width, height);
      const sx = (width - minDim) / 2;
      const sy = (height - minDim) / 2;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bitmap, sx, sy, minDim, minDim, 0, 0, size, size);
      bitmap.close();

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create Blob from Canvas'));
          }
        }, mimeType);
      });
    } catch {
      // フォールバック: HTMLImageElement によるロード
    }
  }

  // HTMLImageElement による標準処理
  return new Promise<Blob>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context is not available'));
          return;
        }

        const { width, height } = img;
        const minDim = Math.min(width, height);
        const sx = (width - minDim) / 2;
        const sy = (height - minDim) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create Blob from Canvas'));
          }
        }, mimeType);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image: ${e}`));
    };

    img.src = objectUrl;
  });
}
