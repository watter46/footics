import type Konva from 'konva';

export function applyPitchTransformToGroups(
  groups: (Konva.Group | null)[],
  effectivePitch: { x: number; y: number },
  panX: number,
  panY: number,
  zoom: number,
): void {
  const layersToRedraw = new Set<Konva.Layer>();
  for (const group of groups) {
    if (group) {
      group.x(effectivePitch.x + panX);
      group.y(effectivePitch.y + panY);
      group.scaleX(zoom);
      group.scaleY(zoom);
      const l = group.getLayer();
      if (l) layersToRedraw.add(l);
    }
  }
  for (const layer of layersToRedraw) {
    layer.batchDraw();
  }
}
