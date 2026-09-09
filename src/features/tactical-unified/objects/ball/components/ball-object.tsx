'use client';

/**
 * ball-object.tsx
 * Draggable realistic 3D soccer ball on the pitch
 */

import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import React, { useCallback, useRef } from 'react';
import { Group } from 'react-konva';
import { normToPx } from '@/features/tactical-unified/objects/canvas';
import { useNodePositionTransition } from '@/features/tactical-unified/objects/canvas/hooks/use-node-position-transition';
import {
  selectActiveSlide,
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { useBallDrag } from '../hooks/use-ball-drag';
import { useBallImage } from '../hooks/use-ball-image';
import type { BallObjectProps } from '../types';
import { BallGhostTrajectory } from './ball-ghost-trajectory';
import { BallOnionskin } from './ball-onionskin';
import { BallVisual } from './ball-visual';

function useBallObjectState({
  stageSize,
  ball,
  nodesRegistryRef,
}: BallObjectProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const updateBallTrajectory = useTacticalUnifiedStore(
    (s) => s.updateBallTrajectory,
  );
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const isSelected = useTacticalUnifiedStore((s) =>
    s.selectedObjects.some((o) => o.kind === 'ball'),
  );

  const ballImage = useBallImage();
  const ghostGroupRef = useRef<Konva.Group | null>(null);
  const ghostLineRef = useRef<Konva.Line | null>(null);
  const ballGroupRef = useRef<Konva.Group | null>(null);

  const drag = useBallDrag({
    stageSize,
    ghostGroupRef,
    ghostLineRef,
  });

  const baseDim = Math.min(stageSize.width, stageSize.height);
  const radius = Math.max(8, baseDim * 0.022);
  const px = normToPx(ball.x, stageSize.width);
  const py = normToPx(ball.y, stageSize.height);

  useNodePositionTransition({
    nodeRef: ballGroupRef,
    x: px,
    y: py,
  });

  const handleUpdateTrajectory = useCallback(
    (traj: Parameters<typeof updateBallTrajectory>[1]) => {
      updateBallTrajectory(activeSlideId, traj);
    },
    [updateBallTrajectory, activeSlideId],
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
      ballGroupRef.current = node;
      if (nodesRegistryRef?.current) {
        nodesRegistryRef.current.ballNode = node;
      }
    },
    [nodesRegistryRef],
  );

  const prevBall = prevSlide?.ball;
  const hasPrevBall =
    (activeSlide?.index ?? 0) >= 1 &&
    Boolean(prevBall?.visible) &&
    ball.visible;
  const prevPxX = prevBall ? normToPx(prevBall.x, stageSize.width) : 0;
  const prevPxY = prevBall ? normToPx(prevBall.y, stageSize.height) : 0;
  const isBallMoved = prevBall
    ? Math.hypot(px - prevPxX, py - prevPxY) >= 4
    : false;

  return {
    isSelected,
    ballImage,
    ghostGroupRef,
    ghostLineRef,
    drag,
    radius,
    px,
    py,
    handleUpdateTrajectory,
    handleSelect,
    setBallGroupRef,
    prevInfo: { prevBall, hasPrevBall, prevPxX, prevPxY, isBallMoved },
  };
}

export const BallObject = React.memo(function BallObject(
  props: BallObjectProps,
) {
  const { ball, stageSize } = props;
  const state = useBallObjectState(props);

  if (!ball.visible) return null;

  const {
    isSelected,
    ballImage,
    ghostGroupRef,
    ghostLineRef,
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
      {/* ── ボール選択時のゴーストボール & 追跡矢印 & ベジェハンドル ── */}
      <BallGhostTrajectory
        isSelected={isSelected && !drag.isDragging}
        hasPrevBall={prevInfo.hasPrevBall}
        prevBall={prevInfo.prevBall}
        ball={ball}
        isBallMoved={prevInfo.isBallMoved}
        prevPxX={prevInfo.prevPxX}
        prevPxY={prevInfo.prevPxY}
        radius={radius}
        ballImage={ballImage}
        stageSize={stageSize}
        onUpdateTrajectory={handleUpdateTrajectory}
      />

      {/* ── ボールドラッグ中限定オニオンスキン ── */}
      <BallOnionskin
        ghostGroupRef={ghostGroupRef}
        ghostLineRef={ghostLineRef}
        radius={radius}
      />

      <Group
        ref={setBallGroupRef}
        x={px}
        y={py}
        draggable={!ball.locked}
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
          isSelected={isSelected && !drag.isDragging}
        />
      </Group>
    </>
  );
});
