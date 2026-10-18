import { useCanvasStore } from '../hooks/use-canvas-store';

export function useCanvasPointerStore() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const continuousDrawing = useCanvasStore((s) => s.continuousDrawing);
  const color = useCanvasStore((s) => s.color);
  const strokeWidth = useCanvasStore((s) => s.strokeWidth);
  const markers = useCanvasStore((s) => s.annotations.markers);
  const drawingPreview = useCanvasStore((s) => s.drawingPreview);
  const setDrawingPreview = useCanvasStore((s) => s.setDrawingPreview);
  const addArrow = useCanvasStore((s) => s.addArrow);
  const addZone = useCanvasStore((s) => s.addZone);
  const addText = useCanvasStore((s) => s.addText);
  const addMarker = useCanvasStore((s) => s.addMarker);
  const eraseAtPoint = useCanvasStore((s) => s.eraseAtPoint);

  return {
    activeTool,
    setActiveTool,
    continuousDrawing,
    color,
    strokeWidth,
    markers,
    drawingPreview,
    setDrawingPreview,
    addArrow,
    addZone,
    addText,
    addMarker,
    eraseAtPoint,
  };
}
