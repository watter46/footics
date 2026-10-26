'use client';

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useRef } from 'react';
import { Group } from 'react-konva';
import type { CanvasNodesRegistry } from '@/features/tactical-unified/core/utils/canvas-registry';
import type { ArrowAnnotation, Player } from '@/lib/types/tactical-unified';
import { ArrowHandlesGroup } from './arrow-handles-group';
import { ArrowHeadNode } from './arrow-head-node';
import { ArrowLineNode } from './arrow-line-node';
import { useArrowCurve } from './use-arrow-curve';
import {
  useArrowKonvaUpdater,
  useArrowSyncAndRegistry,
} from './use-arrow-sync';

type KonvaClickEvent = KonvaEventObject<MouseEvent | TouchEvent>;

export interface ArrowObjectProps {
  arrow: ArrowAnnotation;
  players?: Player[];
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive?: boolean;
  onSelect: (e: KonvaClickEvent) => void;
  updateArrow: (arrowId: string, patch: Partial<ArrowAnnotation>) => void;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export const ArrowObject = React.memo(function ArrowObject({
  arrow,
  players = [],
  stageSize,
  isSelected,
  isInteractive = true,
  onSelect,
  updateArrow,
  nodesRegistryRef,
}: ArrowObjectProps) {
  const curve = useArrowCurve({ arrow, players, stageSize });

  const arrowRef = useRef<Konva.Arrow | null>(null);
  const startHandleRef = useRef<Konva.Circle | null>(null);
  const endHandleRef = useRef<Konva.Circle | null>(null);
  const controlHandleRef = useRef<Konva.Circle | null>(null);
  const startDotRef = useRef<Konva.Circle | null>(null);
  const endDotRef = useRef<Konva.Circle | null>(null);

  useArrowSyncAndRegistry({
    arrowId: arrow.id,
    arrowRef,
    startHandleRef,
    endHandleRef,
    controlHandleRef,
    midHandlePxX: curve.midHandlePxX,
    midHandlePxY: curve.midHandlePxY,
    sPxX: curve.sPxX,
    sPxY: curve.sPxY,
    ePxX: curve.ePxX,
    ePxY: curve.ePxY,
    nodesRegistryRef,
  });

  const updateKonvaPoints = useArrowKonvaUpdater({
    arrowRef,
    controlHandleRef,
    startDotRef,
    endDotRef,
    curve,
    stageSize,
  });

  const hp = {
    arrow,
    stageSize,
    isSelected,
    isInteractive,
    isAttachedToPlayer: curve.isAttachedToPlayer,
    sPxX: curve.sPxX,
    sPxY: curve.sPxY,
    ePxX: curve.ePxX,
    ePxY: curve.ePxY,
    cpPxX: curve.cpPxX,
    cpPxY: curve.cpPxY,
    startHandleRef,
    endHandleRef,
    controlHandleRef,
    onSelect,
    updateArrow,
    updateKonvaPoints,
  };

  return (
    <Group>
      <ArrowLineNode
        {...hp}
        hasArrowHead={curve.hasArrowHead}
        renderPoints={curve.renderPoints}
        p0={curve.p0}
        p1={curve.p1}
        midHandlePxX={curve.midHandlePxX}
        midHandlePxY={curve.midHandlePxY}
        arrowRef={arrowRef}
        startDotRef={startDotRef}
        endDotRef={endDotRef}
      />
      <ArrowHeadNode
        isDotEnd={curve.isDotEnd}
        startDotRef={startDotRef}
        endDotRef={endDotRef}
        sPxX={curve.sPxX}
        sPxY={curve.sPxY}
        ePxX={curve.ePxX}
        ePxY={curve.ePxY}
        color={arrow.color}
        strokeWidth={arrow.strokeWidth}
        dotRadius={curve.dotRadius}
      />
      <ArrowHandlesGroup
        commonProps={hp}
        p0={curve.p0}
        p1={curve.p1}
        isWavy={curve.isWavy}
        midHandlePxX={curve.midHandlePxX}
        midHandlePxY={curve.midHandlePxY}
      />
    </Group>
  );
});
