import React from 'react';
import { ArrowControlPoints } from './arrow-control-points';
import { ArrowEndHandle } from './arrow-end-handle';
import { ArrowStartHandle } from './arrow-start-handle';

export interface ArrowHandlesGroupProps {
  commonProps: any;
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
