'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useEffect, useRef, useState } from 'react';
import { Group } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import {
  generateWavyLinePoints,
  subdivideQuadraticBezier,
} from '@/lib/tactical/compiler/geometry-primitives';
import type { ResolvedArrowPrimitive } from '@/lib/tactical/compiler/scene-graph-dto';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import {
  type ArrowHandlePreviewDelta,
  ArrowHandlesGroup,
} from './arrow-handles-group';
import { ArrowHeadNode } from './arrow-head-node';
import { type ArrowBodyDragDelta, ArrowLineNode } from './arrow-line-node';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowObjectProps {
  arrow: ArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (arrowId: string, patch: Partial<ArrowAnnotation>) => void;
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
  const [previewHandle, setPreviewHandle] =
    useState<ArrowHandlePreviewDelta | null>(null);
  const [bodyDragDelta, setBodyDragDelta] = useState<ArrowBodyDragDelta | null>(
    null,
  );

  useEffect(() => {
    const registry = nodesRegistryRef?.current;
    if (!registry) return;
    if (arrowRef.current) {
      registry.arrowNodes.set(arrow.id, { node: arrowRef.current });
    }
    return () => {
      registry.arrowNodes.delete(arrow.id);
    };
  }, [arrow.id, nodesRegistryRef]);

  const sPxX =
    previewHandle?.kind === 'start'
      ? previewHandle.pxX
      : resolvedArrow.startPointPx.x;
  const sPxY =
    previewHandle?.kind === 'start'
      ? previewHandle.pxY
      : resolvedArrow.startPointPx.y;
  const ePxX =
    previewHandle?.kind === 'end'
      ? previewHandle.pxX
      : resolvedArrow.endPointPx.x;
  const ePxY =
    previewHandle?.kind === 'end'
      ? previewHandle.pxY
      : resolvedArrow.endPointPx.y;
  const isWavy = arrow.arrowType === 'dribble';

  let midHandlePxX = resolvedArrow.controlHandlePx?.x ?? (sPxX + ePxX) / 2;
  let midHandlePxY = resolvedArrow.controlHandlePx?.y ?? (sPxY + ePxY) / 2;
  let renderPoints: number[];

  if (previewHandle === null) {
    renderPoints = [...resolvedArrow.flatPointsPx];
  } else if (isWavy) {
    midHandlePxX = (sPxX + ePxX) / 2;
    midHandlePxY = (sPxY + ePxY) / 2;
    renderPoints = generateWavyLinePoints(sPxX, sPxY, ePxX, ePxY);
  } else if (previewHandle.kind === 'control') {
    midHandlePxX = previewHandle.pxX;
    midHandlePxY = previewHandle.pxY;
    const cpX = 2 * midHandlePxX - 0.5 * (sPxX + ePxX);
    const cpY = 2 * midHandlePxY - 0.5 * (sPxY + ePxY);
    renderPoints = subdivideQuadraticBezier(sPxX, sPxY, cpX, cpY, ePxX, ePxY);
  } else if (resolvedArrow.controlHandlePx) {
    const origS = resolvedArrow.startPointPx;
    const origE = resolvedArrow.endPointPx;
    const origM = resolvedArrow.controlHandlePx;
    const cpX = 2 * origM.x - 0.5 * (origS.x + origE.x);
    const cpY = 2 * origM.y - 0.5 * (origS.y + origE.y);
    midHandlePxX = 0.25 * sPxX + 0.5 * cpX + 0.25 * ePxX;
    midHandlePxY = 0.25 * sPxY + 0.5 * cpY + 0.25 * ePxY;
    renderPoints = subdivideQuadraticBezier(sPxX, sPxY, cpX, cpY, ePxX, ePxY);
  } else {
    midHandlePxX = (sPxX + ePxX) / 2;
    midHandlePxY = (sPxY + ePxY) / 2;
    renderPoints = [sPxX, sPxY, ePxX, ePxY];
  }

  const p0 = arrow.points[0] ?? { x: 0, y: 0 };
  const p1 = arrow.points[1] ?? { x: 0, y: 0 };
  const isAttachedToPlayer = Boolean(
    arrow.sourcePlayerId || arrow.targetPlayerId,
  );
  const isDotEnd = resolvedArrow.endMarker === 'dot';

  const dx = bodyDragDelta?.dxPx ?? 0;
  const dy = bodyDragDelta?.dyPx ?? 0;
  const displaySPxX = sPxX + dx;
  const displaySPxY = sPxY + dy;
  const displayEPxX = ePxX + dx;
  const displayEPxY = ePxY + dy;
  const displayMidPxX = midHandlePxX + dx;
  const displayMidPxY = midHandlePxY + dy;

  const commonProps = {
    arrow,
    stageSize,
    isSelected,
    isInteractive,
    isAttachedToPlayer,
    sPxX: displaySPxX,
    sPxY: displaySPxY,
    ePxX: displayEPxX,
    ePxY: displayEPxY,
    onSelect,
    updateArrow,
    onPreviewMove: setPreviewHandle,
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
        onBodyDragMove={setBodyDragDelta}
      />
      <ArrowHeadNode
        isDotEnd={isDotEnd}
        startDotRef={startDotRef}
        endDotRef={endDotRef}
        sPxX={displaySPxX}
        sPxY={displaySPxY}
        ePxX={displayEPxX}
        ePxY={displayEPxY}
        color={resolvedArrow.color}
        strokeWidth={resolvedArrow.strokeWidthPx}
        dotRadius={resolvedArrow.dotRadiusPx}
      />
      <ArrowHandlesGroup
        commonProps={commonProps}
        p0={p0}
        p1={p1}
        isWavy={isWavy}
        midHandlePxX={displayMidPxX}
        midHandlePxY={displayMidPxY}
      />
    </Group>
  );
});
