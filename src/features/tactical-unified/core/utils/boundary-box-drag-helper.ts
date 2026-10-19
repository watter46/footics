import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';

export type CornerId = 'tl' | 'tr' | 'br' | 'bl';

export type DragContext = {
  pointerX: number;
  pointerY: number;
  box: BoundaryBoxType;
  px: { x: number; y: number; w: number; h: number };
  latestBox: BoundaryBoxType;
};

export interface UseBoundaryBoxDragParams {
  box: BoundaryBoxType;
  baseRect: { x: number; y: number; width: number; height: number };
  pxX: number;
  pxY: number;
  pxW: number;
  pxH: number;
  onUpdate: (box: BoundaryBoxType) => void;
  onCommit?: (box: BoundaryBoxType) => void;
}

export function calculateNewBox(
  cornerId: CornerId,
  deltaX: number,
  deltaY: number,
  start: { x: number; y: number; w: number; h: number },
) {
  let { x, y, w, h } = start;
  if (cornerId === 'br') {
    w = Math.max(20, start.w + deltaX);
    h = Math.max(20, start.h + deltaY);
  } else if (cornerId === 'tr') {
    w = Math.max(20, start.w + deltaX);
    const clampedDeltaY = Math.min(deltaY, start.h - 20);
    h = start.h - clampedDeltaY;
    y = start.y + clampedDeltaY;
  } else if (cornerId === 'tl') {
    const clampedDeltaX = Math.min(deltaX, start.w - 20);
    const clampedDeltaY = Math.min(deltaY, start.h - 20);
    w = start.w - clampedDeltaX;
    h = start.h - clampedDeltaY;
    x = start.x + clampedDeltaX;
    y = start.y + clampedDeltaY;
  } else if (cornerId === 'bl') {
    const clampedDeltaX = Math.min(deltaX, start.w - 20);
    w = start.w - clampedDeltaX;
    h = Math.max(20, start.h + deltaY);
    x = start.x + clampedDeltaX;
  }
  return { x, y, w, h };
}

export function attachDragListeners(
  target: HTMLElement | SVGElement,
  onMove: (evt: PointerEvent) => void,
  onEnd: () => void,
) {
  const moveHandler = (evt: Event) => onMove(evt as PointerEvent);
  const upHandler = () => {
    target.removeEventListener('pointermove', moveHandler);
    target.removeEventListener('pointerup', upHandler);
    target.removeEventListener('pointercancel', upHandler);
    onEnd();
  };
  target.addEventListener('pointermove', moveHandler);
  target.addEventListener('pointerup', upHandler);
  target.addEventListener('pointercancel', upHandler);
}
