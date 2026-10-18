'use client';

import { useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from './use-canvas-store';

export function useCanvasPolygonZone() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const continuousDrawing = useCanvasStore((s) => s.continuousDrawing);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const addZone = useCanvasStore((s) => s.addZone);
  const updateZone = useCanvasStore((s) => s.updateZone);
  const removeZone = useCanvasStore((s) => s.removeZone);
  const selectObject = useCanvasStore((s) => s.selectObject);
  const color = useCanvasStore((s) => s.color);
  const zones = useCanvasStore((s) => s.annotations.zones);

  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (activeTool !== 'polygon_zone' && activePolygonId) {
      removeZone(activePolygonId);
      setActivePolygonId(null);
      setMousePreviewPos(null);
    }
  }, [activeTool, activePolygonId, removeZone]);

  const handlePointerDown = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activeTool !== 'polygon_zone') return false;

      if (!activePolygonId) {
        const id = crypto.randomUUID();
        const stroke = '#f59e0b';
        addZone({
          id,
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          rotation: 0,
          points: [{ x: normPos.x, y: normPos.y }],
          color: stroke,
          opacity: 0.25,
          strokeColor: stroke,
          strokeWidth: 2,
          isComplete: false,
        });
        setActivePolygonId(id);
        return true;
      }

      const poly = zones.find((z) => z.id === activePolygonId);
      if (!poly?.points?.length) return true;

      const startPt = poly.points[0];
      const dist = Math.hypot(normPos.x - startPt.x, normPos.y - startPt.y);

      if (poly.points.length >= 3 && dist < 3.5) {
        updateZone(activePolygonId, { isComplete: true });
        selectObject({ id: activePolygonId, kind: 'zone' });
        setActivePolygonId(null);
        setMousePreviewPos(null);
        if (!continuousDrawing) setActiveTool('select');
        return true;
      }

      updateZone(activePolygonId, {
        points: [...poly.points, { x: normPos.x, y: normPos.y }],
      });
      return true;
    },
    [
      activeTool,
      activePolygonId,
      color,
      addZone,
      zones,
      updateZone,
      selectObject,
      continuousDrawing,
      setActiveTool,
    ],
  );

  const handlePointerMove = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activePolygonId) {
        setMousePreviewPos({ x: normPos.x, y: normPos.y });
        return true;
      }
      return false;
    },
    [activePolygonId],
  );

  return {
    activePolygonId,
    mousePreviewPos,
    handlePointerDown,
    handlePointerMove,
  };
}
