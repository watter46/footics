'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useCallback, useEffect, useRef } from 'react';
import { Group } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import {
  generateWavyLinePoints,
  subdivideQuadraticBezier,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import { toScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import { type ArrowHandleKind, ArrowHandlesGroup } from './arrow-handles-group';
import { ArrowHeadNode } from './arrow-head-node';
import { ArrowLineNode } from './arrow-line-node';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowObjectProps {
  arrow: DomainArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (arrowId: string, patch: Partial<DomainArrowAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  resolvedArrow: ResolvedArrowPrimitive;
}

export const ArrowObject = React.memo(function ArrowObject({
  arrow,
  stageSize,
  isSelected,
  isInteractive = true,
  onSelect,
  updateArrow,
  nodesRegistryRef,
  resolvedArrow,
}: ArrowObjectProps) {
  const arrowRef = useRef<Konva.Arrow | null>(null);
  const startDotRef = useRef<Konva.Circle | null>(null);
  const endDotRef = useRef<Konva.Circle | null>(null);
  const startHandleRef = useRef<Konva.Circle | null>(null);
  const endHandleRef = useRef<Konva.Circle | null>(null);
  const controlHandleRef = useRef<Konva.Circle | null>(null);

  useEffect(() => {
    const registry = nodesRegistryRef?.current;
    if (!registry) return;
    if (arrowRef.current) {
      registry.arrowNodes.set(arrow.id, {
        node: arrowRef.current,
        startDotNode: startDotRef.current,
        endDotNode: endDotRef.current,
        sourcePlayerId: arrow.sourcePlayerId,
        targetPlayerId: arrow.targetPlayerId,
        arrowType: arrow.arrowType,
        curveType: arrow.curveType,
        startMarker: arrow.startMarker,
        endMarker: arrow.endMarker,
        startPx: resolvedArrow.startPointPx,
        endPx: resolvedArrow.endPointPx,
        controlPointPx: resolvedArrow.controlHandlePx,
        sourceRadiusPx: resolvedArrow.sourceRadiusPx,
        targetRadiusPx: resolvedArrow.targetRadiusPx,
        dotRadiusPx: resolvedArrow.dotRadiusPx,
      });
    }
    return () => {
      registry.arrowNodes.delete(arrow.id);
    };
  }, [
    arrow.id,
    arrow.sourcePlayerId,
    arrow.targetPlayerId,
    arrow.arrowType,
    arrow.curveType,
    arrow.startMarker,
    arrow.endMarker,
    resolvedArrow.startPointPx,
    resolvedArrow.endPointPx,
    resolvedArrow.controlHandlePx,
    resolvedArrow.sourceRadiusPx,
    resolvedArrow.targetRadiusPx,
    resolvedArrow.dotRadiusPx,
    nodesRegistryRef,
  ]);

  const sPxX = resolvedArrow.startPointPx.x;
  const sPxY = resolvedArrow.startPointPx.y;
  const ePxX = resolvedArrow.endPointPx.x;
  const ePxY = resolvedArrow.endPointPx.y;
  const isWavy = arrow.arrowType === 'dribble';

  const midHandlePxX = resolvedArrow.controlHandlePx?.x ?? (sPxX + ePxX) / 2;
  const midHandlePxY = resolvedArrow.controlHandlePx?.y ?? (sPxY + ePxY) / 2;
  const renderPoints = [...resolvedArrow.flatPointsPx];

  const handleHandleDragMove = useCallback(
    (kind: ArrowHandleKind, pxX: number, pxY: number) => {
      const sX =
        kind === 'start'
          ? pxX
          : (startHandleRef.current?.x() ?? resolvedArrow.startPointPx.x);
      const sY =
        kind === 'start'
          ? pxY
          : (startHandleRef.current?.y() ?? resolvedArrow.startPointPx.y);
      const eX =
        kind === 'end'
          ? pxX
          : (endHandleRef.current?.x() ?? resolvedArrow.endPointPx.x);
      const eY =
        kind === 'end'
          ? pxY
          : (endHandleRef.current?.y() ?? resolvedArrow.endPointPx.y);

      let nextMidX: number;
      let nextMidY: number;
      let nextPoints: number[];

      if (isWavy) {
        nextMidX = (sX + eX) / 2;
        nextMidY = (sY + eY) / 2;
        nextPoints = generateWavyLinePoints(sX, sY, eX, eY);
      } else if (kind === 'control') {
        nextMidX = pxX;
        nextMidY = pxY;
        const cpX = 2 * nextMidX - 0.5 * (sX + eX);
        const cpY = 2 * nextMidY - 0.5 * (sY + eY);
        nextPoints = subdivideQuadraticBezier(sX, sY, cpX, cpY, eX, eY);
      } else if (resolvedArrow.controlHandlePx) {
        const origS = resolvedArrow.startPointPx;
        const origE = resolvedArrow.endPointPx;
        const origM = resolvedArrow.controlHandlePx;
        const cpX = 2 * origM.x - 0.5 * (origS.x + origE.x);
        const cpY = 2 * origM.y - 0.5 * (origS.y + origE.y);
        nextMidX = 0.25 * sX + 0.5 * cpX + 0.25 * eX;
        nextMidY = 0.25 * sY + 0.5 * cpY + 0.25 * eY;
        nextPoints = subdivideQuadraticBezier(sX, sY, cpX, cpY, eX, eY);
      } else {
        nextMidX = (sX + eX) / 2;
        nextMidY = (sY + eY) / 2;
        nextPoints = [sX, sY, eX, eY];
      }

      arrowRef.current?.points(nextPoints);
      startDotRef.current?.position({ x: sX, y: sY });
      endDotRef.current?.position({ x: eX, y: eY });
      if (kind !== 'control') {
        controlHandleRef.current?.position({ x: nextMidX, y: nextMidY });
      }
      arrowRef.current?.getLayer()?.batchDraw();
    },
    [isWavy, resolvedArrow],
  );

  const handleHandleDragEnd = useCallback(() => {
    arrowRef.current?.getLayer()?.batchDraw();
  }, []);

  const handleBodyDragMove = useCallback(
    (dxPx: number, dyPx: number) => {
      const baseS = resolvedArrow.startPointPx;
      const baseE = resolvedArrow.endPointPx;
      const baseM = resolvedArrow.controlHandlePx ?? {
        x: (baseS.x + baseE.x) / 2,
        y: (baseS.y + baseE.y) / 2,
      };
      startDotRef.current?.position({ x: baseS.x + dxPx, y: baseS.y + dyPx });
      endDotRef.current?.position({ x: baseE.x + dxPx, y: baseE.y + dyPx });
      startHandleRef.current?.position({
        x: baseS.x + dxPx,
        y: baseS.y + dyPx,
      });
      endHandleRef.current?.position({ x: baseE.x + dxPx, y: baseE.y + dyPx });
      controlHandleRef.current?.position({
        x: baseM.x + dxPx,
        y: baseM.y + dyPx,
      });
      arrowRef.current?.getLayer()?.batchDraw();
    },
    [resolvedArrow],
  );

  const p0 = arrow.points[0] ?? toScreenNormPoint(0, 0);
  const p1 = arrow.points[1] ?? toScreenNormPoint(0, 0);
  const isAttachedToPlayer = Boolean(
    arrow.sourcePlayerId || arrow.targetPlayerId,
  );
  const isDotEnd = resolvedArrow.endMarker === 'dot';

  const commonProps = {
    arrow,
    stageSize,
    isSelected,
    isInteractive,
    isAttachedToPlayer,
    sPxX,
    sPxY,
    ePxX,
    ePxY,
    onSelect,
    updateArrow,
    onHandleDragMove: handleHandleDragMove,
    onHandleDragEnd: handleHandleDragEnd,
  };

  return (
    <Group>
      <ArrowLineNode
        arrow={arrow}
        resolvedArrow={resolvedArrow}
        stageSize={stageSize}
        isSelected={isSelected}
        isInteractive={isInteractive}
        isAttachedToPlayer={isAttachedToPlayer}
        renderPoints={renderPoints}
        p0={p0}
        p1={p1}
        arrowRef={arrowRef}
        onSelect={onSelect}
        updateArrow={updateArrow}
        onBodyDragMove={handleBodyDragMove}
      />
      <ArrowHeadNode
        isDotEnd={isDotEnd}
        startDotRef={startDotRef}
        endDotRef={endDotRef}
        sPxX={sPxX}
        sPxY={sPxY}
        ePxX={ePxX}
        ePxY={ePxY}
        color={resolvedArrow.color}
        strokeWidth={resolvedArrow.strokeWidthPx}
        dotRadius={resolvedArrow.dotRadiusPx}
      />
      <ArrowHandlesGroup
        commonProps={commonProps}
        p0={p0}
        p1={p1}
        isWavy={isWavy}
        midHandlePxX={midHandlePxX}
        midHandlePxY={midHandlePxY}
        startHandleRef={startHandleRef}
        endHandleRef={endHandleRef}
        controlHandleRef={controlHandleRef}
      />
    </Group>
  );
});
