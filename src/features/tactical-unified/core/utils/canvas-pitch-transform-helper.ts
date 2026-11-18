import type Konva from 'konva';
import { calculatePitchRect } from '@/lib/tactical/shared/pitch-geometry';
import type {
  AspectRatio,
  BoundaryBox as BoundaryBoxType,
  PitchTransform,
} from '@/lib/types/tactical-unified';

export interface PitchTransformValues {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export { DEFAULT_PITCH_PERSPECTIVE } from './canvas-screen-coordinates';
export const DEFAULT_PITCH_TRANSFORM_ORIGIN = '50% 50%';

/**
 * CSS 3D Transform 文字列を生成するヘルパー (pitch-aspect / unified-canvas 準拠)
 */
export function getCssPitchTransform(
  panX: number,
  panY: number,
  zoom: number,
  tilt = 0,
): string {
  return `translate3d(${panX}px, ${panY}px, 0px) scale(${zoom}) rotateX(${tilt}deg)`;
}

export function calculatePitchTransform(
  effectivePitch: { x: number; y: number; width?: number; height?: number },
  panX: number,
  panY: number,
  zoom: number,
  _tilt = 0,
): PitchTransformValues {
  const pitchWidth = effectivePitch.width ?? 0;
  const pitchHeight = effectivePitch.height ?? 0;

  // ピッチ幾何学中心（50% 50%）を基準にズームおよびパンされるようオフセットを算出
  // (CSS 3D / unified-canvas 側の stageTiltStyle と対称な中心アンカー)
  const deltaX = (pitchWidth / 2) * (1 - zoom);
  const deltaY = (pitchHeight / 2) * (1 - zoom);

  return {
    x: effectivePitch.x + panX + deltaX,
    y: effectivePitch.y + panY + deltaY,
    scaleX: zoom,
    scaleY: zoom,
  };
}

export function applyPitchTransformToGroups(
  groups: (Konva.Group | null)[],
  effectivePitch: { x: number; y: number; width?: number; height?: number },
  panX: number,
  panY: number,
  zoom: number,
  tilt = 0,
): void {
  const { x, y, scaleX, scaleY } = calculatePitchTransform(
    effectivePitch,
    panX,
    panY,
    zoom,
    tilt,
  );
  const layersToRedraw = new Set<Konva.Layer>();
  for (const group of groups) {
    if (group) {
      group.x(x);
      group.y(y);
      group.scaleX(scaleX);
      group.scaleY(scaleY);
      const l = group.getLayer();
      if (l) layersToRedraw.add(l);
    }
  }
  for (const layer of layersToRedraw) {
    layer.batchDraw();
  }
}
export { calculatePitchRect };

export interface ExportCropRectOptions {
  stageSize: { width: number; height: number };
  aspectRatio: AspectRatio;
  boundaryBox?: BoundaryBoxType;
  pitchBounds?: { x: number; y: number; width: number; height: number };
  pitchTransform?: PitchTransform;
}

export interface ExportCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 境界線(BoundaryBox)またはピッチ矩形に基づくスクリーンクロップ座標の算出 */
export function calculateExportCropRect({
  stageSize,
  aspectRatio,
  boundaryBox,
  pitchBounds,
  pitchTransform,
}: ExportCropRectOptions): ExportCropRect {
  const defaultPitchRect = calculatePitchRect(stageSize, aspectRatio);
  let effectivePitchRect: ExportCropRect = {
    x: defaultPitchRect.x,
    y: defaultPitchRect.y,
    width: defaultPitchRect.width,
    height: defaultPitchRect.height,
  };

  if (pitchBounds) {
    effectivePitchRect = {
      x: pitchBounds.x,
      y: pitchBounds.y,
      width: pitchBounds.width,
      height: pitchBounds.height,
    };
  } else if (pitchTransform) {
    const transform = calculatePitchTransform(
      defaultPitchRect,
      pitchTransform.panX,
      pitchTransform.panY,
      pitchTransform.zoom,
      pitchTransform.tilt,
    );
    effectivePitchRect = {
      x: transform.x,
      y: transform.y,
      width: defaultPitchRect.width * transform.scaleX,
      height: defaultPitchRect.height * transform.scaleY,
    };
  }

  const baseRect =
    boundaryBox?.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: stageSize.width, height: stageSize.height }
      : effectivePitchRect;

  if (
    boundaryBox?.enabled &&
    boundaryBox.visible !== false &&
    boundaryBox.width > 0 &&
    boundaryBox.height > 0
  ) {
    return {
      x: baseRect.x + (boundaryBox.x / 100) * baseRect.width,
      y: baseRect.y + (boundaryBox.y / 100) * baseRect.height,
      width: (boundaryBox.width / 100) * baseRect.width,
      height: (boundaryBox.height / 100) * baseRect.height,
    };
  }

  return effectivePitchRect;
}
