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
  normToPx,
  useNodePositionTransition,
} from '@/features/tactical-unified/objects/canvas';
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

export const BallObject = React.memo(function BallObject({
  ball,
  stageSize,
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

  const { handleDragStart, handleDragMove, handleDragEnd } = useBallDrag({
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

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
      selectObject({ id: 'ball', kind: 'ball' }, isShift);
    },
    [selectObject],
  );

  const handleTap = useCallback(
    (e: KonvaEventObject<TouchEvent>) => {
      e.cancelBubble = true;
      selectObject({ id: 'ball', kind: 'ball' }, false);
    },
    [selectObject],
  );

  const dragBoundFunc = useCallback(
    function (this: Konva.Node, pos: Konva.Vector2d) {
      const parentPos = this.getParent()?.getAbsolutePosition() ?? {
        x: 0,
        y: 0,
      };
      return {
        x: Math.max(
          parentPos.x - stageSize.width,
          Math.min(parentPos.x + stageSize.width * 2, pos.x),
        ),
        y: Math.max(
          parentPos.y - stageSize.height,
          Math.min(parentPos.y + stageSize.height * 2, pos.y),
        ),
      };
    },
    [stageSize.width, stageSize.height],
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

  if (!ball.visible) return null;

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

  return (
    <>
      {/* ── ボール選択時のゴーストボール & 追跡矢印 & ベジェハンドル ── */}
      <BallGhostTrajectory
        isSelected={isSelected}
        hasPrevBall={hasPrevBall}
        prevBall={prevBall}
        ball={ball}
        isBallMoved={isBallMoved}
        prevPxX={prevPxX}
        prevPxY={prevPxY}
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
        dragBoundFunc={dragBoundFunc}
        onClick={handleClick}
        onTap={handleTap}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      >
        <BallVisual
          radius={radius}
          ballImage={ballImage}
          isSelected={isSelected}
        />
      </Group>
    </>
  );
});
