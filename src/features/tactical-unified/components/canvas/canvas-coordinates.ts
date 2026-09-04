export function normToPx(norm: number, size: number): number {
  return (norm / 100) * size;
}

export function pxToNorm(px: number, size: number): number {
  return (px / size) * 100;
}

export function screenToPitch(
  pos: { x: number; y: number },
  pitchRect: { x: number; y: number; width: number; height: number },
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  return {
    x: (pos.x - pitchRect.x - panX) / zoom,
    y: (pos.y - pitchRect.y - panY) / zoom,
  };
}

export function getPitchAndNormPos(
  pos: { x: number; y: number },
  pitchRect: { x: number; y: number; width: number; height: number },
  transform: { panX?: number; panY?: number; zoom?: number },
): { pitchPos: { x: number; y: number }; normPos: { x: number; y: number } } {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const pitchPos = {
    x: (pos.x - pitchRect.x - panX) / zoom,
    y: (pos.y - pitchRect.y - panY) / zoom,
  };
  const normPos = {
    x: (pitchPos.x / pitchRect.width) * 100,
    y: (pitchPos.y / pitchRect.height) * 100,
  };
  return { pitchPos, normPos };
}
