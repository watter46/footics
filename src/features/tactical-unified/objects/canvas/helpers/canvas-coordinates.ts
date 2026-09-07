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

export interface PitchTransformState {
  panX?: number;
  panY?: number;
  zoom?: number;
  tilt?: number;
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
 * スクリーン/Canvas座標をピッチ実ピクセル座標に逆変換
 * (Zoom, Pan, Tilt を加味)
 */
export function screenToPitch(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
): Point2D {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const scaleY = zoom * cosTilt;
  const deltaY = pitchRect.height * zoom * (1 - cosTilt);

  return {
    x: (pos.x - pitchRect.x - panX) / zoom,
    y: (pos.y - (pitchRect.y + panY + deltaY)) / scaleY,
  };
}

/**
 * ピッチ実ピクセル座標をスクリーン/Canvas座標に変換
 * (Zoom, Pan, Tilt を加味)
 */
export function pitchToScreen(
  pitchPos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
): Point2D {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const scaleY = zoom * cosTilt;
  const deltaY = pitchRect.height * zoom * (1 - cosTilt);

  return {
    x: pitchRect.x + panX + pitchPos.x * zoom,
    y: pitchRect.y + panY + deltaY + pitchPos.y * scaleY,
  };
}

/**
 * 0-100% 正規化座標を直接スクリーン/Canvas座標に変換
 * (Zoom, Pan, Tilt を加味)
 */
export function normToScreen(
  normPos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
): Point2D {
  const pitchPos = normToPitch(normPos, pitchRect);
  return pitchToScreen(pitchPos, pitchRect, panX, panY, zoom, tilt);
}

/**
 * スクリーン/Canvas座標からピッチ実ピクセル座標および 0-100% 正規化座標を計算
 */
export function getPitchAndNormPos(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  transform: PitchTransformState,
): { pitchPos: Point2D; normPos: Point2D } {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const tilt = transform.tilt ?? 0;
  const pitchPos = screenToPitch(pos, pitchRect, panX, panY, zoom, tilt);
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
