export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoDimensions {
  videoWidth: number;
  videoHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio?: number;
}

/**
 * Calculates the exact active video rectangle within a viewport (e.g. object-fit: contain)
 * by removing letterbox (top/bottom) or pillarbox (left/right) black bars.
 */
export function calculateContainVideoCrop(
  dimensions: VideoDimensions,
): CropRect {
  const {
    videoWidth,
    videoHeight,
    viewportWidth,
    viewportHeight,
    devicePixelRatio = 1,
  } = dimensions;

  if (!videoWidth || !videoHeight || !viewportWidth || !viewportHeight) {
    return {
      x: 0,
      y: 0,
      width: Math.round(viewportWidth * devicePixelRatio),
      height: Math.round(viewportHeight * devicePixelRatio),
    };
  }

  const videoAspect = videoWidth / videoHeight;
  const viewportAspect = viewportWidth / viewportHeight;

  let renderWidth = viewportWidth;
  let renderHeight = viewportHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > viewportAspect) {
    // Video is wider than viewport -> Letterboxing (black bars on top and bottom)
    renderWidth = viewportWidth;
    renderHeight = viewportWidth / videoAspect;
    offsetY = (viewportHeight - renderHeight) / 2;
  } else if (videoAspect < viewportAspect) {
    // Video is taller/narrower than viewport -> Pillarboxing (black bars on left and right)
    renderHeight = viewportHeight;
    renderWidth = viewportHeight * videoAspect;
    offsetX = (viewportWidth - renderWidth) / 2;
  } else {
    // Exact aspect ratio match
    renderWidth = viewportWidth;
    renderHeight = viewportHeight;
  }

  return {
    x: Math.max(0, Math.round(offsetX * devicePixelRatio)),
    y: Math.max(0, Math.round(offsetY * devicePixelRatio)),
    width: Math.max(1, Math.round(renderWidth * devicePixelRatio)),
    height: Math.max(1, Math.round(renderHeight * devicePixelRatio)),
  };
}

/**
 * Crops a captured dataUrl image using createImageBitmap/OffscreenCanvas (or HTMLCanvasElement)
 * to extract only the active video rectangle, eliminating black bars with maximum rendering speed.
 */
export async function cropCapturedImage(
  dataUrl: string,
  cropRect: CropRect,
  mimeType: 'image/png' | 'image/webp' = 'image/webp',
): Promise<string> {
  // 1. 高速パス: fetch blob + createImageBitmap (Offscreen GPU Cropping)
  if (typeof createImageBitmap === 'function') {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(
        blob,
        cropRect.x,
        cropRect.y,
        cropRect.width,
        cropRect.height,
      );

      if (typeof OffscreenCanvas !== 'undefined') {
        const offscreen = new OffscreenCanvas(cropRect.width, cropRect.height);
        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.drawImage(imageBitmap, 0, 0);
          imageBitmap.close();
          const croppedBlob = await offscreen.convertToBlob({
            type: mimeType,
            quality: 0.95,
          });
          return await blobToDataUrl(croppedBlob);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = cropRect.width;
      canvas.height = cropRect.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(imageBitmap, 0, 0);
        imageBitmap.close();
        return canvas.toDataURL(mimeType, 0.95);
      }
    } catch (_err) {
      // Fallback to standard Image() onload pipeline if bitmap decoding fails
    }
  }

  // 2. フォールバック: 標準 HTMLImageElement + Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = cropRect.width;
        canvas.height = cropRect.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2d context for canvas cropping');
        }

        ctx.drawImage(
          img,
          cropRect.x,
          cropRect.y,
          cropRect.width,
          cropRect.height,
          0,
          0,
          cropRect.width,
          cropRect.height,
        );

        const resultUrl = canvas.toDataURL(mimeType, 0.95);
        resolve(resultUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      reject(new Error(`Failed to load image for cropping: ${err}`));
    };

    img.src = dataUrl;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
