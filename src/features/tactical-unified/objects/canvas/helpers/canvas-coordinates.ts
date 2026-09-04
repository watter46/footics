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
  tilt = 0,
): { x: number; y: number } {
  const safeTilt = Math.max(0, Math.min(85, tilt));
  const tiltRad = (safeTilt * Math.PI) / 180;
  const cosTilt = Math.max(0.05, Math.cos(tiltRad));
  const scaleY = zoom * cosTilt;
  const deltaY = pitchRect.height * zoom * (1 - cosTilt);

  return {
    x: (pos.x - pitchRect.x - panX) / zoom,
    y: (pos.y - (pitchRect.y + panY + deltaY)) / scaleY,
  };
}

export function getPitchAndNormPos(
  pos: { x: number; y: number },
  pitchRect: { x: number; y: number; width: number; height: number },
  transform: { panX?: number; panY?: number; zoom?: number; tilt?: number },
): { pitchPos: { x: number; y: number }; normPos: { x: number; y: number } } {
  const panX = transform.panX ?? 0;
  const panY = transform.panY ?? 0;
  const zoom = transform.zoom ?? 1;
  const tilt = transform.tilt ?? 0;
  const pitchPos = screenToPitch(pos, pitchRect, panX, panY, zoom, tilt);
  const normPos = {
    x: (pitchPos.x / pitchRect.width) * 100,
    y: (pitchPos.y / pitchRect.height) * 100,
  };
  return { pitchPos, normPos };
}
