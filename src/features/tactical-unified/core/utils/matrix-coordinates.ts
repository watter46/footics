import { mat4, vec4 } from 'gl-matrix';

export type CameraParams = {
  tilt?: number; // チルト角度（度数法, 例: 0〜60）。0または未指定時は2Dバイパス
  zoom: number; // ズーム倍率（例: 1.0 = 100%）
  panX: number; // パン X（px: Stage ピクセル空間でのオフセット）
  panY: number; // パン Y（px: Stage ピクセル空間でのオフセット）
  stageWidth: number;
  stageHeight: number;
  pitchWidth?: number; // ピッチ矩形の幅（px）
  pitchHeight?: number; // ピッチ矩形の高さ（px）
  pitchX?: number; // ピッチ矩形の左上 X（px）
  pitchY?: number; // ピッチ矩形の左上 Y（px）
  pitchRect?: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  fov?: number; // 視野角（度数法, デフォルト 60）
  near?: number;
  far?: number;
  clamp?: boolean; // ピッチ外領域を [0, 1] に clamp するか（デフォルト: false = 外挿）
};

export type ProjectedPoint = { x: number; y: number }; // 画面座標（px）
export type NormPoint = { x: number; y: number }; // ピッチ正規化座標（0〜1）

export const DEFAULT_FOV = 60;
export const DEFAULT_NEAR = 0.1;
export const DEFAULT_FAR = 1000.0;

interface PitchGeometry {
  pitchWidth: number;
  pitchHeight: number;
  cx: number;
  cy: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

function resolvePitchGeometry(params: CameraParams): PitchGeometry {
  const stageWidth = Math.max(1, params.stageWidth);
  const stageHeight = Math.max(1, params.stageHeight);

  const rect = params.pitchRect;
  const hasCustomPitch =
    params.pitchWidth !== undefined ||
    params.pitchHeight !== undefined ||
    rect !== undefined;

  const pitchWidth = params.pitchWidth ?? rect?.width ?? stageHeight;
  const pitchHeight = params.pitchHeight ?? rect?.height ?? stageHeight;

  let cx = stageWidth / 2;
  let cy = stageHeight / 2;

  if (params.pitchX !== undefined && params.pitchWidth !== undefined) {
    cx = params.pitchX + params.pitchWidth / 2;
  } else if (rect?.x !== undefined && rect?.width !== undefined) {
    cx = rect.x + rect.width / 2;
  }

  if (params.pitchY !== undefined && params.pitchHeight !== undefined) {
    cy = params.pitchY + params.pitchHeight / 2;
  } else if (rect?.y !== undefined && rect?.height !== undefined) {
    cy = rect.y + rect.height / 2;
  }

  const offsetX = cx - stageWidth / 2;
  const offsetY = cy - stageHeight / 2;

  const scaleX = hasCustomPitch ? pitchWidth / stageHeight : 1.0;
  const scaleY = hasCustomPitch ? pitchHeight / stageHeight : 1.0;

  return {
    pitchWidth,
    pitchHeight,
    cx,
    cy,
    scaleX,
    scaleY,
    offsetX,
    offsetY,
  };
}

/**
 * MVP行列を生成する（Model=ピッチ平面, View=カメラ, Projection=透視投影）
 */
export function buildMVPMatrix(params: CameraParams): mat4 {
  const stageWidth = Math.max(1, params.stageWidth);
  const stageHeight = Math.max(1, params.stageHeight);
  const fovDeg = params.fov ?? DEFAULT_FOV;
  const fovRad = (fovDeg * Math.PI) / 180;
  const aspect = stageWidth / stageHeight;
  const near = params.near ?? DEFAULT_NEAR;
  const far = params.far ?? DEFAULT_FAR;

  // 1. Projection Matrix
  const proj = mat4.create();
  mat4.perspective(proj, fovRad, aspect, near, far);

  // 2. View Matrix (カメラ配置: 視野角に合わせて単位平面が収まる距離 D に配置)
  const halfFovTan = Math.tan(fovRad / 2);
  const distance = halfFovTan > 0 ? 0.5 / halfFovTan : 1.0;

  const view = mat4.create();
  mat4.lookAt(view, [0, 0, distance], [0, 0, 0], [0, 1, 0]);

  // 3. Model Matrix (Scale(zoom * aspect) -> RotateX(tilt) -> Translate(pan + offset))
  const geo = resolvePitchGeometry(params);
  const model = mat4.create();
  mat4.identity(model);

  // Translate (panX, panY in Stage px + offset of pitch center)
  // Stage ピクセル空間でのオフセットをワールド座標系にマッピング (1 world unit = stageHeight px)
  // ピッチ正規化座標系で Y軸下向きを 3D空間の Y軸上向きに合わせるため -Y
  const tx = (params.panX + geo.offsetX) / stageHeight;
  const ty = -(params.panY + geo.offsetY) / stageHeight;
  mat4.translate(model, model, [tx, ty, 0]);

  // RotateX (tilt: チルト角度)
  const tilt = params.tilt ?? 0;
  const tiltRad = (tilt * Math.PI) / 180;
  mat4.rotateX(model, model, -tiltRad);

  // Scale (zoom & pitch dimensions)
  const safeZoom = Math.max(0.0001, params.zoom);
  mat4.scale(model, model, [
    safeZoom * geo.scaleX,
    safeZoom * geo.scaleY,
    safeZoom,
  ]);

  // MVP = Projection * View * Model
  const mvp = mat4.create();
  mat4.multiply(mvp, proj, view);
  mat4.multiply(mvp, mvp, model);

  return mvp;
}

/**
 * ピッチ正規化座標（normX, normY: 0〜1）→ 画面座標（px）
 */
export function projectPitchToScreen(
  norm: NormPoint,
  params: CameraParams,
): ProjectedPoint {
  const tilt = params.tilt ?? 0;
  if (Math.abs(tilt) < 1e-5) {
    // 2D 線形変換バイパス
    const geo = resolvePitchGeometry(params);
    const safeZoom = Math.max(0.0001, params.zoom);
    const localX = (norm.x - 0.5) * geo.pitchWidth;
    const localY = (norm.y - 0.5) * geo.pitchHeight;

    const screenX = geo.cx + params.panX + localX * safeZoom;
    const screenY = geo.cy + params.panY + localY * safeZoom;

    return { x: screenX, y: screenY };
  }

  const mvp = buildMVPMatrix(params);

  // ピッチ正規化座標 (0..1, 0..1) をモデル空間 (-0.5..0.5, 0.5..-0.5, 0) にマッピング
  const modelX = norm.x - 0.5;
  const modelY = 0.5 - norm.y;
  const modelPos = vec4.fromValues(modelX, modelY, 0, 1);

  const clip = vec4.create();
  vec4.transformMat4(clip, modelPos, mvp);

  const w = clip[3];
  if (Math.abs(w) < 1e-6) {
    return { x: 0, y: 0 };
  }

  // NDC (-1..1, -1..1)
  const ndcX = clip[0] / w;
  const ndcY = clip[1] / w;

  // 画面座標 (0..stageWidth, 0..stageHeight)
  const screenX = (ndcX + 1) * 0.5 * params.stageWidth;
  const screenY = (1 - ndcY) * 0.5 * params.stageHeight;

  return { x: screenX, y: screenY };
}

/**
 * 画面座標（px）→ ピッチ正規化座標（Raycasting / Unproject）
 * ピッチ平面（z=0）との交点を求める。
 * 地平線より上で交点がない場合は null を返す。
 */
export function unprojectScreenToPitch(
  screen: ProjectedPoint,
  params: CameraParams,
): NormPoint | null {
  const tilt = params.tilt ?? 0;
  if (Math.abs(tilt) < 1e-5) {
    // 2D 線形逆変換バイパス
    const geo = resolvePitchGeometry(params);
    const safeZoom = Math.max(0.0001, params.zoom);
    if (geo.pitchWidth <= 0 || geo.pitchHeight <= 0) {
      return null;
    }

    const localX = (screen.x - geo.cx - params.panX) / safeZoom;
    const localY = (screen.y - geo.cy - params.panY) / safeZoom;

    let normX = 0.5 + localX / geo.pitchWidth;
    let normY = 0.5 + localY / geo.pitchHeight;

    if (params.clamp) {
      normX = Math.max(0, Math.min(1, normX));
      normY = Math.max(0, Math.min(1, normY));
    }

    return { x: normX, y: normY };
  }

  const mvp = buildMVPMatrix(params);
  const invMvp = mat4.create();
  if (!mat4.invert(invMvp, mvp)) {
    return null;
  }

  const stageWidth = Math.max(1, params.stageWidth);
  const stageHeight = Math.max(1, params.stageHeight);

  // 画面座標 → NDC
  const ndcX = (screen.x / stageWidth) * 2 - 1;
  const ndcY = 1 - (screen.y / stageHeight) * 2;

  // NDC near (-1) と far (+1) をモデル空間に逆変換
  const nearClip = vec4.fromValues(ndcX, ndcY, -1, 1);
  const farClip = vec4.fromValues(ndcX, ndcY, 1, 1);

  const nearModel = vec4.create();
  const farModel = vec4.create();

  vec4.transformMat4(nearModel, nearClip, invMvp);
  vec4.transformMat4(farModel, farClip, invMvp);

  if (Math.abs(nearModel[3]) < 1e-6 || Math.abs(farModel[3]) < 1e-6) {
    return null;
  }

  const pNearX = nearModel[0] / nearModel[3];
  const pNearY = nearModel[1] / nearModel[3];
  const pNearZ = nearModel[2] / nearModel[3];

  const pFarX = farModel[0] / farModel[3];
  const pFarY = farModel[1] / farModel[3];
  const pFarZ = farModel[2] / farModel[3];

  const dz = pFarZ - pNearZ;
  if (Math.abs(dz) < 1e-6) {
    // 平面 z=0 と平行
    return null;
  }

  // 直線 P(t) = Near + t * (Far - Near) と z=0 の交点
  const t = -pNearZ / dz;
  if (t < 0) {
    // 地平線より上（カメラの後方でしか交差しない）
    return null;
  }

  const modelX = pNearX + t * (pFarX - pNearX);
  const modelY = pNearY + t * (pFarY - pNearY);

  // モデル空間 (-0.5..0.5, 0.5..-0.5) をピッチ正規化座標 (0..1, 0..1) に逆変換
  let normX = modelX + 0.5;
  let normY = 0.5 - modelY;

  if (params.clamp) {
    normX = Math.max(0, Math.min(1, normX));
    normY = Math.max(0, Math.min(1, normY));
  }

  return { x: normX, y: normY };
}
