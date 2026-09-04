'use client';

/**
 * ball-object.tsx
 * Draggable realistic 3D soccer ball on the pitch
 */

import type Konva from 'konva';
import React, { useRef } from 'react';
import { Group } from 'react-konva';
import { normToPx } from '@/features/tactical-unified/components/canvas/hooks';
import { useNodePositionTransition } from '@/features/tactical-unified/components/canvas/use-node-position-transition';
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

  const ghostGroupRef = useRef<any>(null);
  const ghostLineRef = useRef<any>(null);
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
        onUpdateTrajectory={(traj) => updateBallTrajectory(activeSlideId, traj)}
      />

      {/* ── ボールドラッグ中限定オニオンスキン ── */}
      <BallOnionskin
        ghostGroupRef={ghostGroupRef}
        ghostLineRef={ghostLineRef}
        radius={radius}
      />

      <Group
        ref={(node) => {
          ballGroupRef.current = node;
          if (nodesRegistryRef) {
            nodesRegistryRef.current.ballNode = node;
          }
        }}
        x={px}
        y={py}
        draggable={!ball.locked}
        dragBoundFunc={function (this: any, pos) {
          const parentPos = this.getParent()?.getAbsolutePosition() ?? {
            x: 0,
            y: 0,
          };
          return {
            x: Math.max(
              parentPos.x,
              Math.min(parentPos.x + stageSize.width, pos.x),
            ),
            y: Math.max(
              parentPos.y,
              Math.min(parentPos.y + stageSize.height, pos.y),
            ),
          };
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          const isShift = (e.evt as MouseEvent)?.shiftKey ?? false;
          selectObject({ id: 'ball', kind: 'ball' }, isShift);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          selectObject({ id: 'ball', kind: 'ball' }, false);
        }}
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
