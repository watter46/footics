'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';

export function useCanvasPolygonZone() {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeTool = useSessionStore((s) => s.activeTool);
  const continuousDrawing = useSessionStore((s) => s.continuousDrawing);
  const color = useSessionStore((s) => s.color);
  const drawingPreview = useSessionStore((s) => s.drawingPreview);
  const setDrawingPreview = useSessionStore((s) => s.setDrawingPreview);
  const setActiveTool = useSessionStore((s) => s.setActiveTool);
  const selectObject = useSessionStore((s) => s.selectObject);

  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);

  const [activePolygonId, setActivePolygonId] = useState<string | null>(null);
  const [mousePreviewPos, setMousePreviewPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (activeTool !== 'polygon_zone' && activePolygonId) {
      if (drawingPreview?.tool === 'polygon_zone') {
        setDrawingPreview(null);
      }
      setActivePolygonId(null);
      setMousePreviewPos(null);
    }
  }, [activeTool, activePolygonId, drawingPreview?.tool, setDrawingPreview]);

  const handlePointerDown = useCallback(
    (normPos: { x: number; y: number }): boolean => {
      if (activeTool !== 'polygon_zone') return false;

      const pt = toScreenNormPoint(normPos.x, normPos.y);
      const existingPoints =
        drawingPreview?.tool === 'polygon_zone'
          ? (drawingPreview.polygonPoints ?? [])
          : [];

      if (existingPoints.length === 0) {
        const id = crypto.randomUUID();
        setActivePolygonId(id);
        setDrawingPreview({
          tool: 'polygon_zone',
          startPoint: pt,
          currentPoint: pt,
          polygonPoints: [pt],
        });
        return true;
      }

      const startPt = existingPoints[0];
      if (!startPt) return true;
      const dist = Math.hypot(normPos.x - startPt.x, normPos.y - startPt.y);

      if (existingPoints.length >= 3 && dist < 3.5) {
        const id = activePolygonId ?? crypto.randomUUID();
        const stroke = color && color !== '#ffffff' ? color : '#ef4444';
        const zone: DomainZoneAnnotation = {
          id,
          annotationType: 'zone',
          zoneType: 'generic',
          shapeType: 'polygon',
          points: [...existingPoints],
          color: stroke,
          opacity: 0.25,
          strokeColor: stroke,
          strokeWidth: 2,
        };
        dispatchSlide(activePhaseId, activeSlideId, {
          type: 'ADD_ZONE',
          zone,
        });
        selectObject({ id, kind: 'zone' });
        setDrawingPreview(null);
        setActivePolygonId(null);
        setMousePreviewPos(null);
        if (!continuousDrawing) setActiveTool('select');
        return true;
      }

      setDrawingPreview({
        tool: 'polygon_zone',
        startPoint: startPt,
        currentPoint: pt,
        polygonPoints: [...existingPoints, pt],
      });
      return true;
    },
    [
      activeTool,
      activePolygonId,
      activePhaseId,
      activeSlideId,
      color,
      drawingPreview,
      setDrawingPreview,
      dispatchSlide,
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
