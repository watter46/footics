import { mat4, vec4 } from 'gl-matrix';

export type CameraParams = {
  tilt: number; // チルト角度（度数法, 例: 0〜60）
  zoom: number; // ズーム倍率（例: 1.0 = 100%）
  panX: number; // パン X（ピッチ正規化座標系、-1〜1）
  panY: number; // パン Y（ピッチ正規化座標系、-1〜1）
  stageWidth: number;
  stageHeight: number;
  fov?: number; // 視野角（度数法, デフォルト 60）
  near?: number;
  far?: number;
};

export type ProjectedPoint = { x: number; y: number }; // 画面座標（px）
export type NormPoint = { x: number; y: number }; // ピッチ正規化座標（0〜1）

export const DEFAULT_FOV = 60;
export const DEFAULT_NEAR = 0.1;
export const DEFAULT_FAR = 1000.0;

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

  // 3. Model Matrix (Scale(zoom) -> RotateX(tilt) -> Translate(pan))
  const model = mat4.create();
  mat4.identity(model);

  // Translate (panX, panY)
  // ピッチ正規化座標系で Y軸下向きを 3D空間の Y軸上向きに合わせるため -panY
  mat4.translate(model, model, [params.panX, -params.panY, 0]);

  // RotateX (tilt: チルト角度)
  const tiltRad = (params.tilt * Math.PI) / 180;
  mat4.rotateX(model, model, -tiltRad);

  // Scale (zoom)
  const safeZoom = Math.max(0.0001, params.zoom);
  mat4.scale(model, model, [safeZoom, safeZoom, safeZoom]);

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
 * ピッチ平面（z=0）との交点を求める。ピッチ外は null を返す。
 */
export function unprojectScreenToPitch(
  screen: ProjectedPoint,
  params: CameraParams,
): NormPoint | null {
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

  const modelX = pNearX + t * (pFarX - pNearX);
  const modelY = pNearY + t * (pFarY - pNearY);

  // モデル空間 (-0.5..0.5, 0.5..-0.5) をピッチ正規化座標 (0..1, 0..1) に逆変換
  const normX = modelX + 0.5;
  const normY = 0.5 - modelY;

  // ピッチ外判定 (0..1 の範囲外は null)
  if (normX < 0 || normX > 1 || normY < 0 || normY > 1) {
    return null;
  }

  return { x: normX, y: normY };
}
