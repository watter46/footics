import type Konva from 'konva';
import { useEffect, useRef } from 'react';
import { getQuadraticBezierPoints } from '@/lib/tactical/trajectory';
import type { GhostTrajectoryArrowProps } from '../types';

export interface UseGhostTrajectoryArrowParams {
  playerId?: string;
  nodesRegistryRef?: GhostTrajectoryArrowProps['nodesRegistryRef'];
  startPos: { x: number; y: number };
  sPxX: number;
  sPxY: number;
  ePxX: number;
  ePxY: number;
  trajectory?: GhostTrajectoryArrowProps['trajectory'];
  midHandlePx: { x: number; y: number };
  stageSize: { width: number; height: number };
  onUpdateTrajectory: GhostTrajectoryArrowProps['onUpdateTrajectory'];
}

export function useGhostTrajectoryArrow({
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
}: UseGhostTrajectoryArrowParams) {
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

  const handleMouseEnter = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grab';
  };

  const handleMouseLeave = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'default';
  };

  const handleDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const stage = e.target.getStage();
    if (stage) stage.container().style.cursor = 'grabbing';
  };

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
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
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    e.cancelBubble = true;
    const pos = e.target.position();
    const { width, height } = stageSize;

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
  };

  return {
    arrowRef,
    controlHandleRef,
    groupRef,
    handleMouseEnter,
    handleMouseLeave,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
