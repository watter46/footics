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

export const DEFAULT_PITCH_PERSPECTIVE = 1200;

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
 * スクリーン/Canvas座標をピッチ実ピクセル座標に逆変換
 * (Zoom, Pan, Tilt, Perspective を加味したピッチ幾何学中心基準の3D逆変換)
 */
export function screenToPitch(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
  perspective = DEFAULT_PITCH_PERSPECTIVE,
): Point2D {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const sinTilt = Math.sin(tiltRad);

  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;

  const relX = pos.x - cx;
  const relY = pos.y - cy;

  const safeZoom = Math.max(0.001, zoom);

  if (perspective && perspective > 0 && safeTilt > 0) {
    const denom = safeZoom * (cosTilt + (relY * sinTilt) / perspective);
    const safeDenom =
      Math.abs(denom) < 0.0001 ? (denom < 0 ? -0.0001 : 0.0001) : denom;

    const localY = (relY - panY) / safeDenom;
    const z3d = safeZoom * localY * sinTilt;
    const invScale = 1 - z3d / perspective;
    const localX = (relX * invScale - panX) / safeZoom;

    return {
      x: localX + pitchRect.width / 2,
      y: localY + pitchRect.height / 2,
    };
  }

  // Orthographic / Tilt=0
  const localX = (relX - panX) / safeZoom;
  const localY = (relY - panY) / (safeZoom * cosTilt);

  return {
    x: localX + pitchRect.width / 2,
    y: localY + pitchRect.height / 2,
  };
}

/**
 * ピッチ実ピクセル座標をスクリーン/Canvas座標に変換
 * (Zoom, Pan, Tilt, Perspective を加味したピッチ幾何学中心基準の3D正変換)
 */
export function pitchToScreen(
  pitchPos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
  perspective = DEFAULT_PITCH_PERSPECTIVE,
): Point2D {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const sinTilt = Math.sin(tiltRad);

  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;

  const localX = pitchPos.x - pitchRect.width / 2;
  const localY = pitchPos.y - pitchRect.height / 2;

  const safeZoom = Math.max(0.001, zoom);
  const x3d = safeZoom * localX;
  const y3d = safeZoom * localY * cosTilt;
  const z3d = safeZoom * localY * sinTilt;

  const worldX = panX + x3d;
  const worldY = panY + y3d;

  if (perspective && perspective > 0 && safeTilt > 0) {
    const scale = perspective / (perspective - z3d);
    return {
      x: cx + worldX * scale,
      y: cy + worldY * scale,
    };
  }

  return {
    x: cx + worldX,
    y: cy + worldY,
  };
}

/**
 * 0-100% 正規化座標を直接スクリーン/Canvas座標に変換
 * (Zoom, Pan, Tilt, Perspective を加味)
 */
export function normToScreen(
  normPos: Point2D,
  pitchRect: PitchRectBounds,
  panX = 0,
  panY = 0,
  zoom = 1,
  tilt = 0,
  perspective = DEFAULT_PITCH_PERSPECTIVE,
): Point2D {
  const pitchPos = normToPitch(normPos, pitchRect);
  return pitchToScreen(
    pitchPos,
    pitchRect,
    panX,
    panY,
    zoom,
    tilt,
    perspective,
  );
}

/**
 * スクリーン/Canvas座標からピッチ実ピクセル座標および 0-100% 正規化座標を計算
 */
export function getPitchAndNormPos(
  pos: Point2D,
  pitchRect: PitchRectBounds,
  transform: PitchTransformState,
  perspective = DEFAULT_PITCH_PERSPECTIVE,
): { pitchPos: Point2D; normPos: Point2D } {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const tilt = transform.tilt ?? 0;
  const effPerspective = transform.perspective ?? perspective;
  const pitchPos = screenToPitch(
    pos,
    pitchRect,
    panX,
    panY,
    zoom,
    tilt,
    effPerspective,
  );
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

/**
 * CSS 3D rotateX + perspective による Y座標の歪みを逆変換し、
 * チルト前のステージ中心基準のローカル Y 座標（pitchLocalY）を算出する。
 *
 * @param screenY スクリーン上のポインタ Y 座標 (px)
 * @param stageCenterY ステージ/コンテナの幾何学中心 Y 座標 (px)
 * @param tiltDeg CSS rotateX チルト角度 (度)
 * @param perspective CSS perspective 値 (px, デフォルト 1200)
 * @returns チルト前のローカル Y 座標 (px)、地平線より上で交点が存在しない場合は null
 */
export function unprojectScreenYToCssRotateX(
  screenY: number,
  stageCenterY: number,
  tiltDeg: number,
  perspective: number = DEFAULT_PITCH_PERSPECTIVE,
): number | null {
  const dy = screenY - stageCenterY;
  if (tiltDeg === 0) {
    return dy;
  }

  const theta = (tiltDeg * Math.PI) / 180;
  const cosTheta = Math.cos(theta);
  const sinTheta = Math.sin(theta);

  const denom = perspective * cosTheta + dy * sinTheta;
  if (denom <= 0) {
    return null;
  }

  return (dy * perspective) / denom;
}

export {
  type CameraState,
  DEFAULT_CAMERA_STATE,
  type ScreenProjectedPoint,
  screenToWorld,
  worldToScreen,
} from './matrix-coordinates';
