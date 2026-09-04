import type Konva from 'konva';
import { useEffect } from 'react';
import type { CanvasNodesRegistry } from '../canvas-registry';
import { resolveDynamicArrowPoints } from './arrow-geometry';
import type { useArrowCurve } from './use-arrow-curve';

export interface UseArrowSyncParams {
  arrowId: string;
  arrowRef: React.RefObject<Konva.Arrow | null>;
  startHandleRef: React.RefObject<Konva.Circle | null>;
  endHandleRef: React.RefObject<Konva.Circle | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  midHandlePxX: number;
  midHandlePxY: number;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export function useArrowSyncAndRegistry({
  arrowId,
  arrowRef,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
  midHandlePxX,
  midHandlePxY,
  sPxX,
  sPxY,
  ePxX,
  ePxY,
  nodesRegistryRef,
}: UseArrowSyncParams) {
  useEffect(() => {
    controlHandleRef.current?.position({ x: midHandlePxX, y: midHandlePxY });
    startHandleRef.current?.position({ x: sPxX, y: sPxY });
    endHandleRef.current?.position({ x: ePxX, y: ePxY });
  }, [
    midHandlePxX,
    midHandlePxY,
    sPxX,
    sPxY,
    ePxX,
    ePxY,
    controlHandleRef,
    startHandleRef,
    endHandleRef,
  ]);

  useEffect(() => {
    if (!nodesRegistryRef) return;
    nodesRegistryRef.current.arrowNodes.set(arrowId, {
      node: arrowRef.current,
      startHandleNode: startHandleRef.current,
      endHandleNode: endHandleRef.current,
      controlHandleNode: controlHandleRef.current,
    });
    return () => {
      nodesRegistryRef.current.arrowNodes.delete(arrowId);
    };
  }, [
    arrowId,
    nodesRegistryRef,
    arrowRef,
    startHandleRef,
    endHandleRef,
    controlHandleRef,
  ]);
}

export interface KonvaUpdaterParams {
  arrowRef: React.RefObject<Konva.Arrow | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  startDotRef: React.RefObject<Konva.Circle | null>;
  endDotRef: React.RefObject<Konva.Circle | null>;
  curve: ReturnType<typeof useArrowCurve>;
  stageSize: { width: number; height: number };
}

export function useArrowKonvaUpdater({
  arrowRef,
  controlHandleRef,
  startDotRef,
  endDotRef,
  curve,
  stageSize,
}: KonvaUpdaterParams) {
  return (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    cpx?: number,
    cpy?: number,
  ) => {
    if (!arrowRef.current) return;
    const ch = controlHandleRef.current;
    const points = resolveDynamicArrowPoints({
      sx,
      sy,
      ex,
      ey,
      cpx,
      cpy,
      controlHandlePos: ch ? { x: ch.x(), y: ch.y() } : null,
      isCurved: curve.isCurved,
      isWavy: curve.isWavy,
      isDotEnd: curve.isDotEnd,
      dotRadius: curve.dotRadius,
      sourcePlayer: curve.sourcePlayer,
      targetPlayer: curve.targetPlayer,
      stageSize,
    });
    arrowRef.current.points(points);
    startDotRef.current?.position({ x: sx, y: sy });
    endDotRef.current?.position({ x: ex, y: ey });
    arrowRef.current.getLayer()?.batchDraw();
  };
}
