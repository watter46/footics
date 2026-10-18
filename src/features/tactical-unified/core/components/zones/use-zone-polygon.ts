import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useCallback } from 'react';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
import { normX, normY } from './zone-geometry';

export interface UseZonePolygonParams {
  zone: ZoneAnnotation;
  stageSize: { width: number; height: number };
  updateZone: (zoneId: string, patch: Partial<ZoneAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
  isCreatingThis?: boolean;
  mousePreviewPos?: { x: number; y: number } | null;
}

export function useZonePolygon({
  zone,
  stageSize,
  updateZone,
  nodesRegistryRef,
  isCreatingThis,
  mousePreviewPos,
}: UseZonePolygonParams) {
  const { width, height } = stageSize;
  const pts = zone.points;
  const isComplete = zone.isComplete !== false;

  let renderPts = pts.flatMap((p) => [normX(p.x, width), normY(p.y, height)]);
  if (isCreatingThis && mousePreviewPos) {
    renderPts = [...renderPts, mousePreviewPos.x, mousePreviewPos.y];
  }

  const vertexPairs = pts.map((p) => ({
    normX: p.x,
    normY: p.y,
    pxX: normX(p.x, width),
    pxY: normY(p.y, height),
  }));

  const handleGroupDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target.name() === 'control-handle') {
      e.cancelBubble = true;
    }
  }, []);

  const handleGroupDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (e.target.name() === 'control-handle') return;
      e.cancelBubble = true;
      const dxPx = e.target.x();
      const dyPx = e.target.y();
      e.target.position({ x: 0, y: 0 });

      const dxNorm = (dxPx / width) * 100;
      const dyNorm = (dyPx / height) * 100;

      const newPts = pts.map((p) => ({
        x: p.x + dxNorm,
        y: p.y + dyNorm,
      }));

      updateZone(zone.id, { points: newPts });
    },
    [pts, width, height, zone.id, updateZone],
  );

  const setLineRef = useCallback(
    (node: Konva.Line | null) => {
      if (nodesRegistryRef?.current?.zoneNodes) {
        if (node) nodesRegistryRef.current.zoneNodes.set(zone.id, node);
        else nodesRegistryRef.current.zoneNodes.delete(zone.id);
      }
    },
    [nodesRegistryRef, zone.id],
  );

  return {
    isComplete,
    renderPts,
    vertexPairs,
    handleGroupDragStart,
    handleGroupDragEnd,
    setLineRef,
  };
}
