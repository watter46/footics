export type AnyCanvasRenderingContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export const TACTICAL_CANVAS_FONT_FAMILY =
  'Geist, "Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export interface FrameRenderContext {
  ctx: AnyCanvasRenderingContext2D;
  w: number;
  h: number;
  m?: Float32Array | null;
  toScreenX: (normX: number) => number;
  toScreenY: (normY: number) => number;
  toScreenSizeX: (sizeNorm: number) => number;
  toScreenSizeY: (sizeNorm: number) => number;
  projectObjToScreen: (
    normX: number,
    normY: number,
  ) => { x: number; y: number };
  snap: (n: number) => number;
}

/**
 * 背番号テキストの視覚中央X座標を計算するヘルパー
 * actualBoundingBoxLeft / actualBoundingBoxRight の非対称性を補正
 */
export function getOpticalCenterX(
  ctx: AnyCanvasRenderingContext2D,
  text: string,
  px: number,
): number {
  if (typeof ctx.measureText === 'function') {
    const metrics = ctx.measureText(text);
    if (
      metrics &&
      typeof metrics.actualBoundingBoxLeft === 'number' &&
      typeof metrics.actualBoundingBoxRight === 'number'
    ) {
      return (
        px -
        (metrics.actualBoundingBoxRight - metrics.actualBoundingBoxLeft) / 2
      );
    }
  }
  return px;
}
