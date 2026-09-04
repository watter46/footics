'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import type { Slide } from '@/lib/types/tactical-unified';

interface UseCanvasPolygonZoneOptions {
  activeSlide: Slide | null | undefined;
  activeSlideId: string;
}

export function useCanvasPolygonZone({
  activeSlide,
  activeSlideId,
}: UseCanvasPolygonZoneOptions) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const addZone = useTacticalUnifiedStore((s) => s.addZone);
  const updateZone = useTacticalUnifiedStore((s) => s.updateZone);
  const removeZone = useTacticalUnifiedStore((s) => s.removeZone);
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);

  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (activeTool !== 'polygon_zone' && activePolygonId) {
      removeZone(activeSlideId, activePolygonId);
      setActivePolygonId(null);
      setMousePreviewPos(null);
    }
  }, [activeTool, activePolygonId, activeSlideId, removeZone]);

  const handlePointerDown = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activeTool !== 'polygon_zone') return false;

      if (!activePolygonId) {
        const id = crypto.randomUUID();
        addZone(activeSlideId, {
          id,
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          rotation: 0,
          points: [{ x: normPos.x, y: normPos.y }],
          color: '#22c55e',
          opacity: 0.35,
          strokeColor: '#22c55e',
          strokeWidth: 2,
          isComplete: false,
        });
        setActivePolygonId(id);
        return true;
      }

      const poly = activeSlide?.zones.find((z) => z.id === activePolygonId);
      if (!poly?.points.length) return true;

      const startPt = poly.points[0];
      const dist = Math.hypot(normPos.x - startPt.x, normPos.y - startPt.y);

      if (poly.points.length >= 3 && dist < 3.5) {
        updateZone(activeSlideId, activePolygonId, { isComplete: true });
        selectObject({ id: activePolygonId, kind: 'zone' });
        setActivePolygonId(null);
        setMousePreviewPos(null);
        if (!continuousDrawing) {
          setActiveTool('select');
        }
        return true;
      }

      updateZone(activeSlideId, activePolygonId, {
        points: [...poly.points, { x: normPos.x, y: normPos.y }],
      });
      return true;
    },
    [
      activeTool,
      activePolygonId,
      activeSlide?.zones,
      activeSlideId,
      addZone,
      updateZone,
      selectObject,
      continuousDrawing,
      setActiveTool,
    ],
  );

  const handlePointerMove = useCallback(
    (pitchPos: { x: number; y: number }): boolean => {
      if (activePolygonId) {
        setMousePreviewPos({ x: pitchPos.x, y: pitchPos.y });
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
