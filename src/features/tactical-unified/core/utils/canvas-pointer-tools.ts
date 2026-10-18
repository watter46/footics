import {
  create2DPlayerMarker,
  createRingMarker,
  createTextAnnotation,
} from './canvas-drawing-factory';
import type { useCanvasPointerStore } from './canvas-pointer-state';

export const SHAPE_TOOLS = new Set<string>([
  'pass',
  'dribble',
  'line',
  'route_line',
  'arrow_solid',
  'arrow_dash',
  'arrow_wavy',
  'arrow-straight',
  'arrow-curved',
  'zone_circle',
  'zone',
]);

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

  if (activeTool === 'eraser') {
    eraseAtPoint(normPos, 4);
    return;
  }

  if (SHAPE_TOOLS.has(activeTool)) {
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

  if (activeTool === 'text') {
    const text = createTextAnnotation(normPos.x, normPos.y, '#ffffff');
    addText(text);
    onStartEditText?.(text.id);
    if (!continuousDrawing) setActiveTool('select');
    return;
  }

  if (activeTool === 'player-ring' || activeTool === 'player') {
    const marker =
      activeTool === 'player-ring'
        ? createRingMarker(
            normPos.x,
            normPos.y,
            '#034694',
            `${markers.length + 1}`,
          )
        : create2DPlayerMarker(
            normPos.x,
            normPos.y,
            '#034694',
            `${markers.length + 1}`,
          );
    addMarker(marker);
    if (!continuousDrawing) setActiveTool('select');
  }
}
