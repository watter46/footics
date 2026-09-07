import type { SelectedObject } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { DrawingTool } from '@/features/tactical-unified/stores/tool-slice';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type { DrawingState } from '../types';
import { pxToNorm } from './canvas-coordinates';
import { createDrawnArrow, createDrawnZone } from './drawing-shape-factory';

export function commitShapeToSlide(
  state: DrawingState,
  pitchWidth: number,
  pitchHeight: number,
  activeSlideId: string,
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void,
  addZone: (slideId: string, zone: ZoneAnnotation) => void,
  selectObject: (obj: SelectedObject) => void,
  setActiveTool: (tool: DrawingTool) => void,
  continuousDrawing: boolean,
): void {
  const dist = Math.hypot(
    state.currentX - state.startX,
    state.currentY - state.startY,
  );
  if (dist < 5) return;

  const sNormX = Math.max(
    -100,
    Math.min(200, pxToNorm(state.startX, pitchWidth)),
  );
  const sNormY = Math.max(
    -100,
    Math.min(200, pxToNorm(state.startY, pitchHeight)),
  );
  const cNormX = Math.max(
    -100,
    Math.min(200, pxToNorm(state.currentX, pitchWidth)),
  );
  const cNormY = Math.max(
    -100,
    Math.min(200, pxToNorm(state.currentY, pitchHeight)),
  );

  if (state.tool === 'zone_circle' || state.tool === 'zone') {
    const zone = createDrawnZone(sNormX, sNormY, cNormX, cNormY);
    addZone(activeSlideId, zone);
    selectObject({ id: zone.id, kind: 'zone' });
  } else {
    const arrow = createDrawnArrow(
      state.tool,
      { x: sNormX, y: sNormY },
      { x: cNormX, y: cNormY },
    );
    if (arrow) {
      addArrow(activeSlideId, arrow);
    }
  }

  if (!continuousDrawing) {
    setActiveTool('select');
  }
}
