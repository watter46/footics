'use client';

/**
 * ghost-trajectory-arrow.tsx
 * スライド間ゴーストと実オブジェクト（選手マーカー / ボール）を結ぶ追跡矢印
 * ツールバーの矢印と同一の2次ベジェ曲線・ハンドル逆算・非クランプ座標系に準拠
 */

import React from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import {
  getBezierControlPoint,
  getBezierMidpoint,
  getQuadraticBezierPoints,
} from '@/lib/tactical/trajectory';
import { useGhostTrajectoryArrow } from '../hooks';
import type { GhostTrajectoryArrowProps } from '../types';

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

export const GhostTrajectoryArrow = React.memo(function GhostTrajectoryArrow({
  playerId,
  nodesRegistryRef,
  startPos,
  endPos,
  trajectory,
  stageSize,
  color = '#38bdf8',
  onUpdateTrajectory,
}: GhostTrajectoryArrowProps) {
  const { width, height } = stageSize;

  const sPxX = normX(startPos.x, width);
  const sPxY = normY(startPos.y, height);
  const ePxX = normX(endPos.x, width);
  const ePxY = normY(endPos.y, height);

  const dist = Math.hypot(ePxX - sPxX, ePxY - sPxY);
  const isMoved = dist >= 4;

  const isCurved =
    trajectory?.type === 'custom' ||
    trajectory?.type === 'arc_left' ||
    trajectory?.type === 'arc_right' ||
    trajectory?.controlPoint !== undefined;

  const cpNorm = getBezierControlPoint(startPos, endPos, trajectory);
  const cpPxX = normX(cpNorm.x, width);
  const cpPxY = normY(cpNorm.y, height);

  // 2次ベジェ曲線の頂点 M (t=0.5: M = 0.25*P0 + 0.5*P_control + 0.25*P1)
  const midHandlePx = isCurved
    ? getBezierMidpoint(
        { x: sPxX, y: sPxY },
        { x: ePxX, y: ePxY },
        { x: cpPxX, y: cpPxY },
      )
    : { x: (sPxX + ePxX) / 2, y: (sPxY + ePxY) / 2 };

  const {
    arrowRef,
    controlHandleRef,
    groupRef,
    handleMouseEnter,
    handleMouseLeave,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  } = useGhostTrajectoryArrow({
    playerId,
    nodesRegistryRef,
    startPos,
    sPxX,
    sPxY,
    ePxX,
    ePxY,
    trajectory,
    midHandlePx,
    stageSize,
    onUpdateTrajectory,
  });

  const initialPoints = isCurved
    ? getQuadraticBezierPoints(sPxX, sPxY, cpPxX, cpPxY, ePxX, ePxY)
    : [sPxX, sPxY, ePxX, ePxY];

  return (
    <Group ref={groupRef} visible={isMoved}>
      {/* ── 移動軌道矢印 ── */}
      <Arrow
        ref={arrowRef}
        points={initialPoints}
        stroke={color}
        fill={color}
        strokeWidth={2.5}
        dash={[5, 3]}
        pointerLength={8}
        pointerWidth={6}
        opacity={0.85}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* ── 汎用ベジェ曲線制御ポインタ（黄色の丸ハンドル） ── */}
      <Circle
        ref={controlHandleRef}
        x={midHandlePx.x}
        y={midHandlePx.y}
        radius={6.5}
        fill="#f59e0b"
        stroke="#ffffff"
        strokeWidth={2}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={4}
        perfectDrawEnabled={false}
        draggable
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    </Group>
  );
});
