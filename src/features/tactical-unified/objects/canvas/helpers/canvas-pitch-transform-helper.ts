import type Konva from 'konva';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';
import type {
  AspectRatio,
  BoundaryBox as BoundaryBoxType,
} from '@/lib/types/tactical-unified';

export interface PitchTransformValues {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export function calculatePitchTransform(
  effectivePitch: { x: number; y: number; height?: number },
  panX: number,
  panY: number,
  zoom: number,
  tilt = 0,
): PitchTransformValues {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const scaleX = zoom;
  const scaleY = zoom * cosTilt;
  const pitchHeight = effectivePitch.height ?? 0;
  // Anchor at bottom edge: bottom edge stays fixed, top (far side) tilts forward
  const deltaY = pitchHeight * zoom * (1 - cosTilt);

  return {
    x: effectivePitch.x + panX,
    y: effectivePitch.y + panY + deltaY,
    scaleX,
    scaleY,
  };
}

export function applyPitchTransformToGroups(
  groups: (Konva.Group | null)[],
  effectivePitch: { x: number; y: number; height?: number },
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
}: ExportCropRectOptions): ExportCropRect {
  const pitchRect = calculatePitchRect(stageSize, aspectRatio);
  const baseRect =
    boundaryBox?.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: stageSize.width, height: stageSize.height }
      : pitchRect;

  if (boundaryBox?.enabled && boundaryBox.width > 0 && boundaryBox.height > 0) {
    return {
      x: baseRect.x + (boundaryBox.x / 100) * baseRect.width,
      y: baseRect.y + (boundaryBox.y / 100) * baseRect.height,
      width: (boundaryBox.width / 100) * baseRect.width,
      height: (boundaryBox.height / 100) * baseRect.height,
    };
  }

  return {
    x: pitchRect.x,
    y: pitchRect.y,
    width: pitchRect.width,
    height: pitchRect.height,
  };
}
