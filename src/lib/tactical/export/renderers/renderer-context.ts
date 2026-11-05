import { buildExportMVPMatrix } from '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import type { AspectRatio, PitchTransform } from '@/lib/types/tactical-unified';

export type AnyCanvasRenderingContext2D =
  | CanvasRenderingContext2D
  | OffscreenCanvasRenderingContext2D;

export const TACTICAL_CANVAS_FONT_FAMILY =
  'Geist, "Geist Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

export interface FrameRenderContext {
  ctx: AnyCanvasRenderingContext2D;
  w: number;
  h: number;
  aspectRatio?: AspectRatio;
  outerPitchRect?: { x: number; y: number; width: number; height: number };
  m?: Float32Array | null;
  toScreenX: (normX: number) => number;
  toScreenY: (normY: number) => number;
  toScreenSizeX: (sizeNorm: number) => number;
  toScreenSizeY: (sizeNorm: number) => number;
  projectObjToScreen: (
    normX: number,
    normY: number,
  ) => { x: number; y: number };
  /** 3D線分をNear-plane (clipW >= 0.05) でクリップして画面座標ペアを返す（両方カメラ背後なら null） */
  project3DSegment?: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => [{ x: number; y: number }, { x: number; y: number }] | null;
  snap: (n: number) => number;
}

export const NEAR_PLANE_W = 0.05;

/**
 * 3D透視投影による生のスクリーン座標計算
 */
export function project3DPoint(
  m: Float32Array,
  norm100X: number,
  norm100Y: number,
  w: number,
  h: number,
): { x: number; y: number } {
  const normX = norm100X / 100;
  const normY = norm100Y / 100;
  const modelX = normX - 0.5;
  const modelY = 0.5 - normY;

  const clipX = modelX * m[0] + modelY * m[4] + m[12];
  const clipY = modelX * m[1] + modelY * m[5] + m[13];
  const clipW = modelX * m[3] + modelY * m[7] + m[15];

  if (Math.abs(clipW) < 1e-6) {
    return { x: 0, y: 0 };
  }

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  return {
    x: (ndcX + 1) * 0.5 * w,
    y: (1 - ndcY) * 0.5 * h,
  };
}

/**
 * 3D線分をNear-plane (clipW >= 0.05) でクリップして画面座標ペアを返す
 * 両端点ともカメラ背後なら null
 */
export function project3DLineSegment(
  m: Float32Array,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  h: number,
  nearW = NEAR_PLANE_W,
): [{ x: number; y: number }, { x: number; y: number }] | null {
  const normX1 = x1 / 100;
  const normY1 = y1 / 100;
  const modelX1 = normX1 - 0.5;
  const modelY1 = 0.5 - normY1;
  const clipX1 = modelX1 * m[0] + modelY1 * m[4] + m[12];
  const clipY1 = modelX1 * m[1] + modelY1 * m[5] + m[13];
  const clipW1 = modelX1 * m[3] + modelY1 * m[7] + m[15];

  const normX2 = x2 / 100;
  const normY2 = y2 / 100;
  const modelX2 = normX2 - 0.5;
  const modelY2 = 0.5 - normY2;
  const clipX2 = modelX2 * m[0] + modelY2 * m[4] + m[12];
  const clipY2 = modelX2 * m[1] + modelY2 * m[5] + m[13];
  const clipW2 = modelX2 * m[3] + modelY2 * m[7] + m[15];

  const behind1 = clipW1 < nearW;
  const behind2 = clipW2 < nearW;

  if (behind1 && behind2) {
    return null;
  }

  const clipToScreen = (cx: number, cy: number, cw: number) => {
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    return {
      x: (ndcX + 1) * 0.5 * w,
      y: (1 - ndcY) * 0.5 * h,
    };
  };

  if (behind1) {
    const t = (nearW - clipW1) / (clipW2 - clipW1);
    const clippedX = clipX1 + t * (clipX2 - clipX1);
    const clippedY = clipY1 + t * (clipY2 - clipY1);
    return [
      clipToScreen(clippedX, clippedY, nearW),
      clipToScreen(clipX2, clipY2, clipW2),
    ];
  }

  if (behind2) {
    const t = (nearW - clipW1) / (clipW2 - clipW1);
    const clippedX = clipX1 + t * (clipX2 - clipX1);
    const clippedY = clipY1 + t * (clipY2 - clipY1);
    return [
      clipToScreen(clipX1, clipY1, clipW1),
      clipToScreen(clippedX, clippedY, nearW),
    ];
  }

  return [
    clipToScreen(clipX1, clipY1, clipW1),
    clipToScreen(clipX2, clipY2, clipW2),
  ];
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

export interface CreateFrameRenderContextParams {
  ctx: AnyCanvasRenderingContext2D;
  baseWidth: number;
  baseHeight: number;
  aspectRatio: AspectRatio;
  mvpMatrix?: Float32Array | null;
  pitchTransformOverride?: PitchTransform | null;
  framePitchTransform?: PitchTransform | null;
}

export function createFrameRenderContext({
  ctx,
  baseWidth,
  baseHeight,
  aspectRatio,
  mvpMatrix,
  pitchTransformOverride,
  framePitchTransform,
}: CreateFrameRenderContextParams): FrameRenderContext {
  const outerPitchRect = calculatePitchRect(
    { width: baseWidth, height: baseHeight },
    aspectRatio,
  );
  const toScreenX = (normX: number) => (normX / 100) * baseWidth;
  const toScreenY = (normY: number) => (normY / 100) * baseHeight;
  const toScreenSizeX = (normSize: number) => (normSize / 100) * baseWidth;
  const toScreenSizeY = (normSize: number) => (normSize / 100) * baseHeight;

  let m = mvpMatrix && mvpMatrix.length === 16 ? mvpMatrix : null;
  if (!m) {
    const effectiveTransform = pitchTransformOverride ?? framePitchTransform;
    if (
      effectiveTransform &&
      (effectiveTransform.tilt !== 0 ||
        (effectiveTransform.yaw !== undefined &&
          effectiveTransform.yaw !== 90) ||
        effectiveTransform.zoom !== 1 ||
        effectiveTransform.panX !== 0 ||
        effectiveTransform.panY !== 0)
    ) {
      m = new Float32Array(
        buildExportMVPMatrix(
          effectiveTransform,
          baseWidth,
          baseHeight,
          aspectRatio,
        ),
      );
    }
  }

  const project3D = (
    norm100X: number,
    norm100Y: number,
  ): { x: number; y: number } => {
    if (!m) return { x: 0, y: 0 };
    return project3DPoint(m, norm100X, norm100Y, baseWidth, baseHeight);
  };

  const project3DSegment = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): [{ x: number; y: number }, { x: number; y: number }] | null => {
    if (!m) {
      return [
        {
          x: outerPitchRect.x + (x1 / 100) * outerPitchRect.width,
          y: outerPitchRect.y + (y1 / 100) * outerPitchRect.height,
        },
        {
          x: outerPitchRect.x + (x2 / 100) * outerPitchRect.width,
          y: outerPitchRect.y + (y2 / 100) * outerPitchRect.height,
        },
      ];
    }
    return project3DLineSegment(m, x1, y1, x2, y2, baseWidth, baseHeight);
  };

  const projectObjToScreen = (
    norm100X: number,
    norm100Y: number,
  ): { x: number; y: number } => {
    if (m) {
      return project3D(norm100X, norm100Y);
    }
    return { x: toScreenX(norm100X), y: toScreenY(norm100Y) };
  };

  const snap = (v: number) => v;

  return {
    ctx,
    w: baseWidth,
    h: baseHeight,
    aspectRatio,
    outerPitchRect,
    m,
    toScreenX,
    toScreenY,
    toScreenSizeX,
    toScreenSizeY,
    projectObjToScreen,
    project3DSegment,
    snap,
  };
}
