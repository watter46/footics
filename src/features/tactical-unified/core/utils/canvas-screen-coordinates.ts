/**
 * 3D Screen / Pitch 座標変換ヘルパー群 (純粋関数)
 *
 * Zoom, Pan, Tilt (CSS rotateX), Perspective を加味した
 * スクリーン/Canvas座標とピッチ実座標・正規化座標の相互変換を提供する。
 */

import type {
  PitchRectBounds,
  PitchTransformState,
  Point2D,
} from './canvas-coordinates';

export const DEFAULT_PITCH_PERSPECTIVE = 1200;

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
  const pitchPos: Point2D = {
    x: (normPos.x / 100) * pitchRect.width,
    y: (normPos.y / 100) * pitchRect.height,
  };
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
  const normPos: Point2D = {
    x: pitchRect.width === 0 ? 0 : (pitchPos.x / pitchRect.width) * 100,
    y: pitchRect.height === 0 ? 0 : (pitchPos.y / pitchRect.height) * 100,
  };
  return { pitchPos, normPos };
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
