'use client';

/**
 * ghost-trajectory-arrow.tsx
 * スライド間ゴーストと実オブジェクト（選手マーカー / ボール）を結ぶ追跡矢印
 * ツールバーの矢印と同一の2次ベジェ曲線・ハンドル逆算・非クランプ座標系に準拠
 */

import type Konva from 'konva';
import React, { useEffect, useRef } from 'react';
import { Arrow, Circle, Group } from 'react-konva';
import {
  getBezierControlPoint,
  getBezierMidpoint,
  getQuadraticBezierPoints,
} from '@/lib/tactical/trajectory';
import type { PlayerTrajectory } from '@/lib/types/tactical-unified';
import type { CanvasNodesRegistry } from './canvas-registry';

function normX(v: number, w: number) {
  return (v / 100) * w;
}
function normY(v: number, h: number) {
  return (v / 100) * h;
}

export interface GhostTrajectoryArrowProps {
  playerId?: string;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  startPos: { x: number; y: number };
  endPos: { x: number; y: number };
  trajectory?: PlayerTrajectory;
  stageSize: { width: number; height: number };
  color?: string;
  onUpdateTrajectory: (trajectory: PlayerTrajectory | undefined) => void;
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

  const arrowRef = useRef<Konva.Arrow | null>(null);
  const controlHandleRef = useRef<Konva.Circle | null>(null);
  const groupRef = useRef<Konva.Group | null>(null);

  // CanvasNodesRegistry に登録してドラッグ中の直接命令更新を可能にする
  useEffect(() => {
    if (!nodesRegistryRef?.current || !playerId) return;
    nodesRegistryRef.current.trajectoryArrowNodes.set(playerId, {
      groupNode: groupRef.current,
      arrowNode: arrowRef.current,
      controlHandleNode: controlHandleRef.current,
      startPx: { x: sPxX, y: sPxY },
      startPos,
      trajectory,
    });
    return () => {
      nodesRegistryRef.current?.trajectoryArrowNodes.delete(playerId);
    };
  }, [nodesRegistryRef, playerId, sPxX, sPxY, startPos, trajectory]);

  // コンポーネント更新時に Konva ノード座標を厳密に同期
  useEffect(() => {
    if (controlHandleRef.current) {
      controlHandleRef.current.position({
        x: midHandlePx.x,
        y: midHandlePx.y,
      });
    }
  }, [midHandlePx.x, midHandlePx.y]);

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
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grab';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
        onDragStart={(e) => {
          e.cancelBubble = true;
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'grabbing';
        }}
        onDragMove={(e) => {
          e.cancelBubble = true;
          const pos = e.target.position();
          // 2次ベジェ中間点 M = pos から制御点 CP を逆算:
          // M = 0.25*P0 + 0.5*P_control + 0.25*P1
          // ∴ P_control = 2*M - 0.5*(P0 + P1)
          const calcCpX = 2 * pos.x - 0.5 * (sPxX + ePxX);
          const calcCpY = 2 * pos.y - 0.5 * (sPxY + ePxY);

          if (arrowRef.current) {
            const pts = getQuadraticBezierPoints(
              sPxX,
              sPxY,
              calcCpX,
              calcCpY,
              ePxX,
              ePxY,
            );
            arrowRef.current.points(pts);
            arrowRef.current.getLayer()?.batchDraw();
          }
        }}
        onDragEnd={(e) => {
          e.cancelBubble = true;
          const pos = e.target.position();
          // 逆算された制御点 P_control (ツールバー矢印と同様、クランプなしで広範レンジ保持)
          const calcCpX = 2 * pos.x - 0.5 * (sPxX + ePxX);
          const calcCpY = 2 * pos.y - 0.5 * (sPxY + ePxY);

          const newNormX = (calcCpX / width) * 100;
          const newNormY = (calcCpY / height) * 100;

          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';

          // 直線との距離判定 (6px未満なら直線へリセット)
          const midPxX = (sPxX + ePxX) / 2;
          const midPxY = (sPxY + ePxY) / 2;
          const distFromMid = Math.hypot(pos.x - midPxX, pos.y - midPxY);

          if (distFromMid < 6.0) {
            e.target.position({ x: midPxX, y: midPxY });
            onUpdateTrajectory({
              type: 'straight',
              controlPoint: undefined,
            });
          } else {
            onUpdateTrajectory({
              type: 'custom',
              controlPoint: {
                x: Math.round(newNormX * 10) / 10,
                y: Math.round(newNormY * 10) / 10,
              },
            });
          }
        }}
      />
    </Group>
  );
});
