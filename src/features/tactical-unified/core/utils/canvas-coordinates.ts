/**
 * 2D Canvas / Pitch 座標変換ヘルパー群 (純粋関数)
 *
 * - 0.0〜100.0% のピッチ正規化座標 (NormPos)
 * - ピッチ実ピクセル座標 (PitchPos: ピッチ左上を原点とするpx)
 * - Canvas/スクリーン実座標 (ScreenPos: Canvasコンテナ左上を原点とするpx)
 *
 * の相互変換および clamp 処理を提供する。
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface PitchRectSize {
  width: number;
  height: number;
}

export interface PitchRectBounds extends PitchRectSize {
  x: number;
  y: number;
}

export {
  DEFAULT_PITCH_PERSPECTIVE,
  getPitchAndNormPos,
  normToScreen,
  pitchToScreen,
  screenToPitch,
  unprojectScreenYToCssRotateX,
} from './canvas-screen-coordinates';

export interface PitchTransformState {
  panX?: number;
  panY?: number;
  zoom?: number;
  tilt?: number;
  perspective?: number;
}

/**
 * 0-100% 正規化値をピクセル値に変換
 */
export function normToPx(norm: number, size: number): number {
  return (norm / 100) * size;
}

/**
 * ピクセル値を 0-100% 正規化値に変換
 */
export function pxToNorm(px: number, size: number): number {
  if (size === 0) return 0;
  return (px / size) * 100;
}

/**
 * 0-100% 正規化座標 (normPos) をピッチ実ピクセル座標 (pitchPos) に変換
 */
export function normToPitch(
  normPos: Point2D,
  pitchRect: PitchRectSize,
): Point2D {
  return {
    x: normToPx(normPos.x, pitchRect.width),
    y: normToPx(normPos.y, pitchRect.height),
  };
}

/**
 * ピッチ実ピクセル座標 (pitchPos) を 0-100% 正規化座標 (normPos) に変換
 */
export function pitchToNorm(
  pitchPos: Point2D,
  pitchRect: PitchRectSize,
): Point2D {
  return {
    x: pxToNorm(pitchPos.x, pitchRect.width),
    y: pxToNorm(pitchPos.y, pitchRect.height),
  };
}

/**
 * Konva Stage 平面座標をピッチ実ピクセル座標に逆変換
 * (ピッチ幾何学中心基準の 2D Zoom/Pan 逆変換。Konva Stage は CSS 3D 内でブラウザにより既に逆射影されているため tilt は適用しない)
 */
export function stageToPitch(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
): Point2D {
  const safeZoom = Math.max(0.001, zoom);
  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;

  const relX = pos.x - cx;
  const relY = pos.y - cy;

  const localX = (relX - panX) / safeZoom;
  const localY = (relY - panY) / safeZoom;

  return {
    x: localX + pitchRect.width / 2,
    y: localY + pitchRect.height / 2,
  };
}

/**
 * ピッチ実ピクセル座標を Konva Stage 平面座標に正変換
 * (ピッチ幾何学中心基準の 2D Zoom/Pan 正変換)
 */
export function pitchToStage(
  pitchPos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
): Point2D {
  const safeZoom = Math.max(0.001, zoom);
  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;

  const localX = pitchPos.x - pitchRect.width / 2;
  const localY = pitchPos.y - pitchRect.height / 2;

  return {
    x: cx + panX + localX * safeZoom,
    y: cy + panY + localY * safeZoom,
  };
}

/**
 * Konva Stage 平面座標からピッチ実ピクセル座標および 0-100% 正規化座標を計算
 */
export function getStagePitchAndNormPos(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  transform: PitchTransformState,
): { pitchPos: Point2D; normPos: Point2D } {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const pitchPos = stageToPitch(pos, pitchRect, panX, panY, zoom);
  const normPos = pitchToNorm(pitchPos, pitchRect);
  return { pitchPos, normPos };
}

/**
 * 0-100% 正規化値を範囲内 [min, max] に clamp
 */
export function clampNorm(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 0-100% 正規化座標点 (Point2D) を範囲内 [min, max] に clamp
 */
export function clampNormPoint(pos: Point2D, min = 0, max = 100): Point2D {
  return {
    x: clampNorm(pos.x, min, max),
    y: clampNorm(pos.y, min, max),
  };
}

export {
  type CameraState,
  DEFAULT_CAMERA_STATE,
  type ScreenProjectedPoint,
  screenToWorld,
  worldToScreen,
} from './matrix-coordinates';
