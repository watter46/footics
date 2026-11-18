'use client';

/**
 * ball-object.tsx
 * Draggable realistic 3D soccer ball on the pitch
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useCallback, useRef } from 'react';
import { Group } from 'react-konva';
import {
  selectDomainActiveSlide,
  selectDomainPreviousSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { screenNormToStagePixel } from '@/lib/tactical/engine/coordinates';
import {
  clampToScreenNorm,
  toScreenNormCoord,
} from '@/lib/types/tactical/branded';
import type { DomainBallState } from '@/lib/types/tactical/domain-entities';
import { useBallDrag } from '../hooks/use-ball-drag';
import { useBallImage } from '../hooks/use-ball-image';
import type { BallObjectProps } from '../types';
import { BallGhostTrajectory } from './ball-ghost-trajectory';
import { BallVisual } from './ball-visual';

function useBallObjectState({
  stageSize,
  ball,
  resolvedBall,
  nodesRegistryRef,
}: BallObjectProps) {
  const project = useDocumentStore((s) => s.project);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectObject = useSessionStore((s) => s.selectObject);
  const isSelected = useSessionStore((s) =>
    s.selectedObjects.some((o) => o.kind === 'ball'),
  );

  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
  const prevSlide = selectDomainPreviousSlide(
    project,
    activePhaseId,
    activeSlideId,
  );

  const ballImage = useBallImage();
  const selectionRingRef = useRef<Konva.Circle>(null);
  const drag = useBallDrag({
    stageSize,
    nodesRegistryRef,
    selectionRingRef,
    isSelected,
  });

  const radius = resolvedBall.radiusPx;
  const px = resolvedBall.positionPx.x;
  const py = resolvedBall.positionPx.y;

  const handleUpdateTrajectory = useCallback(
    (
      traj:
        | {
            type: 'straight' | 'arc_left' | 'arc_right' | 'custom';
            curveOffset?: number;
            controlPoint?: { x: number; y: number };
          }
        | undefined,
    ) => {
      const domainTraj: DomainBallState['trajectory'] = traj
        ? {
            ...traj,
            controlPoint: traj.controlPoint
              ? {
                  x: toScreenNormCoord(traj.controlPoint.x),
                  y: toScreenNormCoord(traj.controlPoint.y),
                }
              : undefined,
          }
        : undefined;
      dispatchSlide(activePhaseId, activeSlideId, {
        type: 'UPDATE_BALL',
        patch: { trajectory: domainTraj },
      });
    },
    [dispatchSlide, activePhaseId, activeSlideId],
  );

  const handleSelect = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
      e.cancelBubble = true;
      const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
      selectObject({ id: 'ball', kind: 'ball' }, isShift);
    },
    [selectObject],
  );

  const setBallGroupRef = useCallback(
    (node: Konva.Group | null) => {
      if (nodesRegistryRef?.current) {
        nodesRegistryRef.current.ballNode = node;
      }
    },
    [nodesRegistryRef],
  );

  const baseBall: DomainBallState = activeSlide?.ball ?? {
    ...ball,
    x: clampToScreenNorm(ball.x),
    y: clampToScreenNorm(ball.y),
    trajectory: ball.trajectory
      ? {
          ...ball.trajectory,
          controlPoint: ball.trajectory.controlPoint
            ? {
                x: toScreenNormCoord(ball.trajectory.controlPoint.x),
                y: toScreenNormCoord(ball.trajectory.controlPoint.y),
              }
            : undefined,
        }
      : undefined,
  };

  const domainBall: DomainBallState = baseBall;

  const prevBall = prevSlide?.ball;
  const hasPrevBall =
    (activeSlide?.index ?? 0) >= 1 &&
    Boolean(prevBall?.visible) &&
    resolvedBall.visible;
  const prevPx = prevBall
    ? screenNormToStagePixel(
        { x: prevBall.x, y: prevBall.y },
        { width: stageSize.width, height: stageSize.height },
      )
    : { x: 0, y: 0 };
  const isBallMoved = prevBall
    ? Math.hypot(domainBall.x - prevBall.x, domainBall.y - prevBall.y) >= 1.0
    : false;

  return {
    domainBall,
    isSelected,
    selectionRingRef,
    ballImage,
    drag,
    radius,
    px,
    py,
    handleUpdateTrajectory,
    handleSelect,
    setBallGroupRef,
    prevInfo: {
      prevBall,
      hasPrevBall,
      prevPxX: prevPx.x,
      prevPxY: prevPx.y,
      isBallMoved,
    },
  };
}

export const BallObject = React.memo(function BallObject(
  props: BallObjectProps,
) {
  const {
    ball,
    resolvedBall,
    stageSize,
    cleanRender,
    isInteractive = true,
  } = props;
  const state = useBallObjectState(props);

  if (!resolvedBall.visible) return null;

  const {
    domainBall,
    isSelected,
    selectionRingRef,
    ballImage,
    drag,
    radius,
    px,
    py,
    handleUpdateTrajectory,
    handleSelect,
    setBallGroupRef,
    prevInfo,
  } = state;

  return (
    <>
      {/* ── スライド間ゴーストボール & 追跡矢印 & ベジェハンドル ── */}
      {!cleanRender && prevInfo.hasPrevBall && prevInfo.prevBall && (
        <BallGhostTrajectory
          isSelected={isSelected}
          isDragging={drag.isDragging}
          cleanRender={cleanRender}
          hasPrevBall={prevInfo.hasPrevBall}
          prevBall={prevInfo.prevBall}
          ball={domainBall}
          isBallMoved={prevInfo.isBallMoved}
          prevPxX={prevInfo.prevPxX}
          prevPxY={prevInfo.prevPxY}
          radius={radius}
          ballImage={ballImage}
          stageSize={stageSize}
          nodesRegistryRef={props.nodesRegistryRef}
          onUpdateTrajectory={handleUpdateTrajectory}
        />
      )}

      <Group
        ref={setBallGroupRef}
        x={px}
        y={py}
        draggable={!cleanRender && isInteractive && !ball.locked}
        dragBoundFunc={drag.dragBoundFunc}
        onClick={handleSelect}
        onTap={handleSelect}
        onDragStart={drag.handleDragStart}
        onDragMove={drag.handleDragMove}
        onDragEnd={drag.handleDragEnd}
      >
        <BallVisual
          radius={radius}
          ballImage={ballImage}
          isSelected={!cleanRender && isSelected}
          selectionRingRef={selectionRingRef}
        />
      </Group>
    </>
  );
});
