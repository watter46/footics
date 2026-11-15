import type { StageViewport } from '@/lib/tactical/engine/coordinates';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import {
  type StagePixelPoint,
  toStagePixel,
} from '@/lib/types/tactical/branded';
import type { PitchTransform } from '@/lib/types/tactical/camera-config';
import type { AspectRatio } from '@/lib/types/tactical-unified';

export const REFERENCE_STAGE_HEIGHT = 360;
const DEFAULT_FOV_DEG = 60;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 1000.0;

/**
 * 3Dチルト時のビルボードアイテムの深度キーを算出する。
 * Y座標昇順ソート用（値が小さいほど奥、大きいほど手前）。
 * 同一Y座標の場合は player < ball < text の順に手前に重ねるため微小オフセットを付加する。
 */
export function computeBillboardDepthKey(
  pointPx: StagePixelPoint,
  kind: 'player' | 'ball' | 'text',
  tiltDeg: number,
): number {
  const kindBias = kind === 'player' ? 0 : kind === 'ball' ? 0.1 : 0.2;
  const tiltFactor = Math.cos((tiltDeg * Math.PI) / 180);
  return pointPx.y * Math.max(0.1, tiltFactor) + kindBias;
}

function createIdentityMat4(): Float32Array {
  const m = new Float32Array(16);
  m[0] = 1;
  m[5] = 1;
  m[10] = 1;
  m[15] = 1;
  return m;
}

function createPerspectiveMat4(
  fovRad: number,
  aspect: number,
  near: number,
  far: number,
): Float32Array {
  const f = 1.0 / Math.tan(fovRad / 2);
  const nf = 1 / (near - far);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) * nf;
  out[11] = -1;
  out[14] = 2 * far * near * nf;
  return out;
}

function createLookAtMat4(eyeZ: number): Float32Array {
  const out = createIdentityMat4();
  out[14] = -eyeZ;
  return out;
}

function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    const b0 = b[col * 4];
    const b1 = b[col * 4 + 1];
    const b2 = b[col * 4 + 2];
    const b3 = b[col * 4 + 3];
    out[col * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
    out[col * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
    out[col * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
    out[col * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
  }
  return out;
}

function translateMat4(
  m: Float32Array,
  x: number,
  y: number,
  z: number,
): Float32Array {
  const t = createIdentityMat4();
  t[12] = x;
  t[13] = y;
  t[14] = z;
  return multiplyMat4(m, t);
}

function rotateXMat4(m: Float32Array, rad: number): Float32Array {
  const r = createIdentityMat4();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  r[5] = c;
  r[6] = s;
  r[9] = -s;
  r[10] = c;
  return multiplyMat4(m, r);
}

function rotateZMat4(m: Float32Array, rad: number): Float32Array {
  const r = createIdentityMat4();
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  r[0] = c;
  r[1] = s;
  r[4] = -s;
  r[5] = c;
  return multiplyMat4(m, r);
}

function scaleMat4(
  m: Float32Array,
  x: number,
  y: number,
  z: number,
): Float32Array {
  const s = createIdentityMat4();
  s[0] = x;
  s[5] = y;
  s[10] = z;
  return multiplyMat4(m, s);
}

/**
 * 3D 透視投影 MVP 行列（Float32Array 16要素, column-major）を構築する。
 */
export function buildExportMVPMatrix(
  pitchTransform: PitchTransform,
  exportWidth: number,
  exportHeight: number,
  aspectRatio: AspectRatio = '16:9',
  referenceHeight: number = REFERENCE_STAGE_HEIGHT,
): Float32Array {
  const stageWidth = Math.max(1, exportWidth);
  const stageHeight = Math.max(1, exportHeight);
  const fovRad = (DEFAULT_FOV_DEG * Math.PI) / 180;
  const aspect = stageWidth / stageHeight;

  const proj = createPerspectiveMat4(fovRad, aspect, DEFAULT_NEAR, DEFAULT_FAR);
  const halfFovTan = Math.tan(fovRad / 2);
  const distance = halfFovTan > 0 ? 0.5 / halfFovTan : 1.0;
  const view = createLookAtMat4(distance);

  const pitchRect = calculatePitchRect(
    { width: stageWidth, height: stageHeight },
    aspectRatio,
  );
  const cx = pitchRect.x + pitchRect.width / 2;
  const cy = pitchRect.y + pitchRect.height / 2;
  const offsetX = cx - stageWidth / 2;
  const offsetY = cy - stageHeight / 2;
  const scaleX = pitchRect.width / stageHeight;
  const scaleY = pitchRect.height / stageHeight;

  const scaleRatio = referenceHeight > 0 ? stageHeight / referenceHeight : 1;
  const panX = (pitchTransform.panX || 0) * scaleRatio;
  const panY = (pitchTransform.panY || 0) * scaleRatio;
  const tilt = pitchTransform.tilt ?? 0;
  const relativeYaw = 90 - (pitchTransform.yaw ?? 90);
  const safeZoom = Math.max(0.0001, pitchTransform.zoom ?? 1);

  let model = createIdentityMat4();
  model = translateMat4(
    model,
    (panX + offsetX) / stageHeight,
    -(panY + offsetY) / stageHeight,
    0,
  );
  model = rotateXMat4(model, -(tilt * Math.PI) / 180);
  if (Math.abs(relativeYaw) > 1e-5) {
    model = rotateZMat4(model, -(relativeYaw * Math.PI) / 180);
  }
  model = scaleMat4(model, safeZoom * scaleX, safeZoom * scaleY, safeZoom);

  return multiplyMat4(multiplyMat4(proj, view), model);
}

/**
 * StagePixelPoint に対して PitchTransform (pan, zoom, tilt, yaw) を適用した投影座標と深度スケールを算出する。
 */
export function projectStagePixelWithPitchTransform(
  point: StagePixelPoint,
  viewport: StageViewport,
  pitchTransform: PitchTransform | null | undefined,
): StagePixelPoint & { readonly scale: number } {
  if (!pitchTransform) {
    return { x: point.x, y: point.y, scale: 1 };
  }
  const zoom = Math.max(0.0001, pitchTransform.zoom ?? 1);
  const panX = pitchTransform.panX ?? 0;
  const panY = pitchTransform.panY ?? 0;
  const tilt = pitchTransform.tilt ?? 0;
  const yaw = pitchTransform.yaw ?? 0;

  if (
    zoom === 1 &&
    panX === 0 &&
    panY === 0 &&
    Math.abs(tilt) < 1e-5 &&
    Math.abs(yaw) < 1e-5
  ) {
    return { x: point.x, y: point.y, scale: 1 };
  }

  const offsetX = viewport.offsetX ?? 0;
  const offsetY = viewport.offsetY ?? 0;
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const scaleRatio = height / REFERENCE_STAGE_HEIGHT;

  if (Math.abs(tilt) < 1e-5 && Math.abs(yaw) < 1e-5) {
    const cx = offsetX + width / 2;
    const cy = offsetY + height / 2;
    return {
      x: toStagePixel(cx + panX * scaleRatio + (point.x - cx) * zoom),
      y: toStagePixel(cy + panY * scaleRatio + (point.y - cy) * zoom),
      scale: zoom,
    };
  }

  const mvp = buildExportMVPMatrix(
    pitchTransform,
    width,
    height,
    undefined,
    REFERENCE_STAGE_HEIGHT,
  );
  const modelX = (point.x - offsetX) / width - 0.5;
  const modelY = 0.5 - (point.y - offsetY) / height;

  const clipX = mvp[0] * modelX + mvp[4] * modelY + mvp[12];
  const clipY = mvp[1] * modelX + mvp[5] * modelY + mvp[13];
  const clipW = mvp[3] * modelX + mvp[7] * modelY + mvp[15];

  if (Math.abs(clipW) < 1e-6 || !Number.isFinite(clipW)) {
    return { x: point.x, y: point.y, scale: 1 };
  }

  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  const x = offsetX + (ndcX + 1) * 0.5 * width;
  const y = offsetY + (1 - ndcY) * 0.5 * height;

  const fovRad = (DEFAULT_FOV_DEG * Math.PI) / 180;
  const distance = 0.5 / Math.tan(fovRad / 2);
  const scale = Math.max(0.05, zoom * (distance / clipW));

  return { x: toStagePixel(x), y: toStagePixel(y), scale };
}
