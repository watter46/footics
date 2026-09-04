import type Konva from 'konva';

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
  // Center pitch vertically when foreshortened by tilt
  const deltaY = (pitchHeight * zoom * (1 - cosTilt)) / 2;

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
