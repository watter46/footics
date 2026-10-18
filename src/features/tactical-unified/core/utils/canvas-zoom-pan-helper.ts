export interface VirtualRect {
  width: number;
  height: number;
}

export interface PanStartState {
  x: number;
  y: number;
  panX: number;
  panY: number;
}

export function computeWheelZoom(oldZoom: number, deltaY: number): number {
  const factor = deltaY < 0 ? 1.08 : 1 / 1.08;
  const next = Math.max(0.2, Math.min(5.0, oldZoom * factor));
  return Math.abs(next - oldZoom) < 0.0001 ? oldZoom : next;
}

export function computeCursorZoomAdjustment(
  pos: { x: number; y: number },
  vRect: VirtualRect,
  oldPanX: number,
  oldPanY: number,
  oldZoom: number,
  nextZoom: number,
): { nextPanX: number; nextPanY: number } {
  const cx = vRect.width / 2;
  const cy = vRect.height / 2;
  const relX = pos.x - cx;
  const relY = pos.y - cy;
  const ratio = nextZoom / oldZoom;
  return {
    nextPanX: relX - (relX - oldPanX) * ratio,
    nextPanY: relY - (relY - oldPanY) * ratio,
  };
}

export function computePanDelta(
  start: PanStartState,
  current: { x: number; y: number },
): { nextPanX: number; nextPanY: number } {
  return {
    nextPanX: start.panX + (current.x - start.x),
    nextPanY: start.panY + (current.y - start.y),
  };
}
