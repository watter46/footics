import type { PitchRectBounds, Point2D } from './canvas-coordinates';
import {
  type CameraParams,
  projectPitchToScreen,
  unprojectScreenToPitch,
} from './matrix-mvp-engine';

export {
  buildMVPMatrix,
  type CameraParams,
  DEFAULT_FAR,
  DEFAULT_FOV,
  DEFAULT_NEAR,
  type NormPoint,
  type PitchGeometry,
  type ProjectedPoint,
  projectPitchToScreen,
  resolvePitchGeometry,
  unprojectScreenToPitch,
} from './matrix-mvp-engine';

export interface CameraState {
  tilt: number; // 0〜60 (度数法)
  yaw: number; // -45〜45 (度数法, 左右覗き込み, 初期値 0)
  zoom: number; // デフォルト 1.0
  panX: number; // px
  panY: number; // px
}

export const DEFAULT_CAMERA_STATE: CameraState = {
  tilt: 0,
  yaw: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
};

export interface ScreenProjectedPoint {
  x: number;
  y: number;
  perspectiveScale: number;
}

export function worldToScreen(
  worldPos: Point2D,
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
  stageSize?: { width: number; height: number },
): ScreenProjectedPoint {
  const tilt = camera.tilt ?? 0;
  const yaw = camera.yaw ?? 0;
  const zoom = camera.zoom ?? 1;
  const panX = camera.panX ?? 0;
  const panY = camera.panY ?? 0;
  const stW = stageSize?.width ?? pitchRect.x * 2 + pitchRect.width;
  const stH = stageSize?.height ?? pitchRect.y * 2 + pitchRect.height;

  const projected = projectPitchToScreen(
    { x: worldPos.x / 100, y: worldPos.y / 100 },
    {
      tilt,
      yaw,
      zoom,
      panX,
      panY,
      stageWidth: stW,
      stageHeight: stH,
      pitchRect,
    },
  );
  // tilt > 0 時は画面上部ほど縮小、下部ほど拡大する簡易遠近スケールを付与
  const normY = worldPos.y / 100;
  const tiltRad = (tilt * Math.PI) / 180;
  const depthFactor =
    tilt === 0 ? 1 : 1 + (normY - 0.5) * Math.sin(tiltRad) * 0.35;
  return {
    x: projected.x,
    y: projected.y,
    perspectiveScale: Math.max(0.2, zoom * depthFactor),
  };
}

export function screenToWorld(
  screenPos: Point2D,
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
  stageSize?: { width: number; height: number },
): Point2D | null {
  const tilt = camera.tilt ?? 0;
  const yaw = camera.yaw ?? 0;
  const zoom = camera.zoom ?? 1;
  const panX = camera.panX ?? 0;
  const panY = camera.panY ?? 0;
  const stW = stageSize?.width ?? pitchRect.x * 2 + pitchRect.width;
  const stH = stageSize?.height ?? pitchRect.y * 2 + pitchRect.height;

  const unprojected = unprojectScreenToPitch(screenPos, {
    tilt,
    yaw,
    zoom,
    panX,
    panY,
    stageWidth: stW,
    stageHeight: stH,
    pitchRect,
    clamp: false,
  });
  if (!unprojected) return null;
  return { x: unprojected.x * 100, y: unprojected.y * 100 };
}
