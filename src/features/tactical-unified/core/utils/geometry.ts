import type { KonvaEventObject } from 'konva/lib/Node';
import { type PitchTransformState, stageToPitch } from './canvas-coordinates';

export function isPointInPolygon(
  point: { x: number; y: number },
  vs: Array<{ x: number; y: number }>,
): boolean {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i]?.x ?? 0;
    const yi = vs[i]?.y ?? 0;
    const xj = vs[j]?.x ?? 0;
    const yj = vs[j]?.y ?? 0;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number },
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y)),
  );
}

export function pointerToNormalizedCoord(
  pos: { x: number; y: number },
  vRect: {
    x?: number;
    y?: number;
    width: number;
    height: number;
  },
  options?: {
    allowOverflow?: boolean;
    transform?: PitchTransformState;
  },
): { x: number; y: number } {
  let relX = pos.x - (vRect.x ?? 0);
  let relY = pos.y - (vRect.y ?? 0);

  const transform = options?.transform;
  if (
    transform &&
    ((transform.zoom !== undefined && transform.zoom !== 1) ||
      Boolean(transform.panX) ||
      Boolean(transform.panY))
  ) {
    const pitchPos = stageToPitch(
      { x: pos.x, y: pos.y },
      {
        x: vRect.x ?? 0,
        y: vRect.y ?? 0,
        width: vRect.width,
        height: vRect.height,
      },
      transform.panX ?? 0,
      transform.panY ?? 0,
      transform.zoom ?? 1,
    );
    relX = pitchPos.x;
    relY = pitchPos.y;
  }

  const normX = vRect.width > 0 ? (relX / vRect.width) * 100 : 0;
  const normY = vRect.height > 0 ? (relY / vRect.height) * 100 : 0;

  return {
    x: options?.allowOverflow ? normX : Math.max(0, Math.min(100, normX)),
    y: options?.allowOverflow ? normY : Math.max(0, Math.min(100, normY)),
  };
}

export function getPointerCoordinates(
  e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>,
  vRect: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    allowOverflow?: boolean;
  },
  transform?: PitchTransformState,
): { pixelPos: { x: number; y: number }; normPos: { x: number; y: number } } {
  const stage = e.target.getStage();
  const evt = e.evt;
  if (stage && typeof stage.setPointersPositions === 'function') {
    stage.setPointersPositions(evt);
  }
  const pointer = stage?.getPointerPosition();
  let x = pointer?.x;
  let y = pointer?.y;

  if (x === undefined || y === undefined) {
    if ('clientX' in evt) {
      const container = stage?.container?.();
      const rect =
        typeof container?.getBoundingClientRect === 'function'
          ? container.getBoundingClientRect()
          : null;
      x = rect ? evt.clientX - rect.left : evt.clientX;
      y = rect ? evt.clientY - rect.top : evt.clientY;
    } else {
      x = 0;
      y = 0;
    }
  }

  const normPos = pointerToNormalizedCoord({ x, y }, vRect, {
    allowOverflow: vRect.allowOverflow,
    transform,
  });

  return {
    pixelPos: { x, y },
    normPos,
  };
}

export function resolveBoundaryBoxPixelRect(
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
    fitTarget?: string;
  },
  stageSize: { width: number; height: number },
  pitchRect?: { x: number; y: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const refRect =
    pitchRect && pitchRect.width > 0 && pitchRect.height > 0
      ? pitchRect
      : { x: 0, y: 0, width: stageSize.width, height: stageSize.height };
  return {
    x: refRect.x + (box.x / 100) * refRect.width,
    y: refRect.y + (box.y / 100) * refRect.height,
    width: (box.width / 100) * refRect.width,
    height: (box.height / 100) * refRect.height,
  };
}
