import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import type { ArrowAnnotation } from '@/lib/types/tactical-unified';
import { ArrowControlPoints } from './arrow-control-points';
import { ArrowEndHandle } from './arrow-end-handle';
import { ArrowStartHandle } from './arrow-start-handle';

export interface ArrowHandleCommonProps {
  arrow: ArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  cpPxX: number;
  cpPxY: number;
  startHandleRef: React.RefObject<Konva.Circle | null>;
  endHandleRef: React.RefObject<Konva.Circle | null>;
  controlHandleRef: React.RefObject<Konva.Circle | null>;
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  updateArrow: (id: string, p: Partial<ArrowAnnotation>) => void;
  updateKonvaPoints: (
    sx: number,
    sy: number,
    ex: number,
    ey: number,
    cpx?: number,
    cpy?: number,
  ) => void;
}

export interface ArrowHandlesGroupProps {
  commonProps: ArrowHandleCommonProps;
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  isWavy: boolean;
  midHandlePxX: number;
  midHandlePxY: number;
}

export const ArrowHandlesGroup = React.memo(function ArrowHandlesGroup({
  commonProps,
  p0,
  p1,
  isWavy,
  midHandlePxX,
  midHandlePxY,
}: ArrowHandlesGroupProps) {
  return (
    <>
      <ArrowStartHandle {...commonProps} p1={p1} />
      <ArrowEndHandle {...commonProps} p0={p0} />
      <ArrowControlPoints
        {...commonProps}
        p0={p0}
        p1={p1}
        isWavy={isWavy}
        midHandlePxX={midHandlePxX}
        midHandlePxY={midHandlePxY}
      />
    </>
  );
});
