import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React from 'react';
import type { ScreenNormPoint } from '@/lib/types/tactical/branded';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import { ArrowControlPoints } from './arrow-control-points';
import { ArrowEndHandle } from './arrow-end-handle';
import { ArrowStartHandle } from './arrow-start-handle';

export type ArrowHandleKind = 'start' | 'end' | 'control';

export interface ArrowHandleCommonProps {
  arrow: DomainArrowAnnotation;
  stageSize: { width: number; height: number };
  isSelected: boolean;
  isInteractive: boolean;
  isAttachedToPlayer: boolean;
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  onSelect: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  updateArrow: (id: string, p: Partial<DomainArrowAnnotation>) => void;
  onHandleDragMove?: (kind: ArrowHandleKind, pxX: number, pxY: number) => void;
  onHandleDragEnd?: () => void;
}

export interface ArrowHandlesGroupProps {
  commonProps: ArrowHandleCommonProps;
  p0: ScreenNormPoint;
  p1: ScreenNormPoint;
  isWavy: boolean;
  midHandlePxX: number;
  midHandlePxY: number;
  startHandleRef?: React.Ref<Konva.Circle>;
  endHandleRef?: React.Ref<Konva.Circle>;
  controlHandleRef?: React.Ref<Konva.Circle>;
}

export const ArrowHandlesGroup = React.memo(function ArrowHandlesGroup({
  commonProps,
  p0,
  p1,
  isWavy,
  midHandlePxX,
  midHandlePxY,
  startHandleRef,
  endHandleRef,
  controlHandleRef,
}: ArrowHandlesGroupProps) {
  return (
    <>
      <ArrowStartHandle {...commonProps} p1={p1} handleRef={startHandleRef} />
      <ArrowEndHandle {...commonProps} p0={p0} handleRef={endHandleRef} />
      <ArrowControlPoints
        {...commonProps}
        p0={p0}
        p1={p1}
        isWavy={isWavy}
        midHandlePxX={midHandlePxX}
        midHandlePxY={midHandlePxY}
        handleRef={controlHandleRef}
      />
    </>
  );
});
