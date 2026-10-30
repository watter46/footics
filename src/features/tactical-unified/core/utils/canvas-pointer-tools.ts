import { getDrawingToolBehavior } from './canvas-drawing-factory';
import type { useCanvasPointerStore } from './canvas-pointer-state';

class DynamicShapeToolsSet extends Set<string> {
  override has(value: string): boolean {
    return getDrawingToolBehavior(value)?.interactionKind === 'drag-shape';
  }
}

export const SHAPE_TOOLS = new DynamicShapeToolsSet();

export type PointerToolContext = ReturnType<typeof useCanvasPointerStore> & {
  onStartEditText?: (textId: string) => void;
};

export function handleToolPointerDown(
  normPos: { x: number; y: number },
  ctx: PointerToolContext,
): void {
  const {
    activeTool,
    markers,
    continuousDrawing,
    onStartEditText,
    setActiveTool,
    setDrawingPreview,
    addText,
    addMarker,
    eraseAtPoint,
  } = ctx;

  const behavior = getDrawingToolBehavior(activeTool);
  if (!behavior) return;

  if (behavior.interactionKind === 'eraser') {
    eraseAtPoint(normPos, 4);
    return;
  }

  if (behavior.interactionKind === 'drag-shape') {
    setDrawingPreview({
      isDrawing: true,
      tool: activeTool,
      startX: normPos.x,
      startY: normPos.y,
      currentX: normPos.x,
      currentY: normPos.y,
    });
    return;
  }

  if (behavior.interactionKind === 'point-place' && behavior.placePoint) {
    behavior.placePoint(normPos, {
      markersCount: markers.length,
      addText,
      addMarker,
      onStartEditText,
    });
    if (!continuousDrawing) setActiveTool('select');
  }
}
