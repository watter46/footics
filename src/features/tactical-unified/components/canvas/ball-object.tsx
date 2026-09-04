'use client';

/**
 * ball-object.tsx
 * Draggable realistic 3D soccer ball on the pitch
 */

import React, { useEffect, useRef, useState } from 'react';
import { Circle, Group, Image as KonvaImage, Line } from 'react-konva';
import { getSoccerBallImage } from '@/lib/tactical/soccer-ball-svg';
import type { BallState } from '@/lib/types/tactical-unified';
import {
  selectActiveSlide,
  selectPreviousSlide,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';
import { GhostTrajectoryArrow } from './ghost-trajectory-arrow';
import { normToPx } from './unified-canvas';

interface BallObjectProps {
  ball: BallState;
  stageSize: { width: number; height: number };
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
}

export const BallObject = React.memo(function BallObject({
  ball,
  stageSize,
  nodesRegistryRef,
}: BallObjectProps) {
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
  const prevSlide = useTacticalUnifiedStore(selectPreviousSlide);
  const setBallPosition = useTacticalUnifiedStore((s) => s.setBallPosition);
  const updateBallTrajectory = useTacticalUnifiedStore(
    (s) => s.updateBallTrajectory,
  );
  const selectObject = useTacticalUnifiedStore((s) => s.selectObject);
  const isSelected = useTacticalUnifiedStore((s) =>
    s.selectedObjects.some((o) => o.kind === 'ball'),
  );
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);

  const ghostGroupRef = useRef<any>(null);
  const ghostLineRef = useRef<any>(null);
  const prevBallPxRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    getSoccerBallImage()
      .then((img) => setBallImage(img))
      .catch(() => {});
  }, []);

  if (!ball.visible) return null;

  const baseDim = Math.min(stageSize.width, stageSize.height);
  const radius = Math.max(8, baseDim * 0.022);
  const px = normToPx(ball.x, stageSize.width);
  const py = normToPx(ball.y, stageSize.height);

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
      {/* ── ボール選択時のゴーストボール & 追跡矢印 & ベジェハンドル (常時表示: activeSlideIndex >= 1) ── */}
      {isSelected && hasPrevBall && prevBall && isBallMoved && (
        <Group>
          {/* ── 1つ前のスライドの位置（ゴーストボール） ── */}
          <Group x={prevPxX} y={prevPxY} opacity={0.45} listening={false}>
            {ballImage ? (
              <KonvaImage
                image={ballImage}
                x={-radius}
                y={-radius}
                width={radius * 2}
                height={radius * 2}
                perfectDrawEnabled={false}
              />
            ) : (
              <Circle
                radius={radius}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth={1.5}
                dash={[3, 2]}
                perfectDrawEnabled={false}
              />
            )}
          </Group>

          {/* ── ボール追跡矢印 & 制御ポインタ ── */}
          <GhostTrajectoryArrow
            startPos={{ x: prevBall.x, y: prevBall.y }}
            endPos={{ x: ball.x, y: ball.y }}
            trajectory={ball.trajectory}
            stageSize={stageSize}
            color="#38bdf8"
            onUpdateTrajectory={(traj) =>
              updateBallTrajectory(activeSlideId, traj)
            }
          />
        </Group>
      )}

      {/* ── ボールドラッグ中限定オニオンスキン (前スライドゴースト & 軌跡プレビュー) ── */}
      <Group ref={ghostGroupRef} visible={false} listening={false}>
        <Line
          ref={ghostLineRef}
          points={[]}
          stroke="#fbbf24"
          strokeWidth={2}
          dash={[4, 4]}
          opacity={0.65}
          listening={false}
          perfectDrawEnabled={false}
        />
        <Circle
          radius={radius}
          fill="#fbbf24"
          stroke="#ffffff"
          strokeWidth={1.5}
          dash={[3, 3]}
          opacity={0.35}
          shadowColor="#000000"
          shadowBlur={3}
          shadowOpacity={0.3}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>

      <Group
        ref={(node) => {
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
        onDragStart={(e) => {
          selectObject({ id: 'ball', kind: 'ball' }, false);
          const node = e.currentTarget;
          node.scale({ x: 1.25, y: 1.25 });
          node.moveToTop();
          const stage = node.getStage();
          if (stage) stage.container().style.cursor = 'grabbing';

          // 前スライドにおけるボール座標を取得
          const prevB = prevSlide?.ball;
          if (prevB?.visible) {
            const pPxX = normToPx(prevB.x, stageSize.width);
            const pPxY = normToPx(prevB.y, stageSize.height);
            prevBallPxRef.current = { x: pPxX, y: pPxY };

            if (ghostGroupRef.current) {
              ghostGroupRef.current.position({ x: pPxX, y: pPxY });
            }
            if (ghostLineRef.current) {
              ghostLineRef.current.points([pPxX, pPxY, px, py]);
            }
            if (ghostGroupRef.current) {
              ghostGroupRef.current.visible(true);
              ghostGroupRef.current.getLayer()?.batchDraw();
            }
          } else {
            prevBallPxRef.current = null;
            if (ghostGroupRef.current) {
              ghostGroupRef.current.visible(false);
            }
          }
        }}
        onDragMove={(e) => {
          const node = e.currentTarget;
          if (prevBallPxRef.current && ghostLineRef.current) {
            ghostLineRef.current.points([
              prevBallPxRef.current.x,
              prevBallPxRef.current.y,
              node.x(),
              node.y(),
            ]);
            node.getLayer()?.batchDraw();
          }
        }}
        onDragEnd={(e) => {
          const node = e.currentTarget;
          node.scale({ x: 1, y: 1 });
          const stage = node.getStage();
          if (stage) stage.container().style.cursor = 'default';

          if (ghostGroupRef.current) {
            ghostGroupRef.current.visible(false);
            ghostGroupRef.current.getLayer()?.batchDraw();
          }
          prevBallPxRef.current = null;

          const x = Math.max(
            0,
            Math.min(100, (node.x() / stageSize.width) * 100),
          );
          const y = Math.max(
            0,
            Math.min(100, (node.y() / stageSize.height) * 100),
          );
          setBallPosition(activeSlideId, x, y);
        }}
      >
        {/* ヒットテスト用円 (クリック・ドラッグ検出を100%確実にする) */}
        <Circle
          radius={radius}
          fill="transparent"
          listening={true}
          perfectDrawEnabled={false}
        />

        {/* 選択中のハイライトリング */}
        {isSelected && (
          <Circle
            radius={radius + 3.5}
            stroke="#38bdf8"
            strokeWidth={1.5}
            dash={[3, 2]}
            shadowColor="#38bdf8"
            shadowBlur={4}
            shadowOpacity={0.6}
            listening={false}
            perfectDrawEnabled={false}
          />
        )}

        {/* リアルなサッカーボール画像 (SVG) */}
        {ballImage ? (
          <KonvaImage
            image={ballImage}
            x={-radius}
            y={-radius}
            width={radius * 2}
            height={radius * 2}
            perfectDrawEnabled={false}
            listening={false}
          />
        ) : (
          <Circle
            radius={radius}
            fill="#ffffff"
            stroke="#0f172a"
            strokeWidth={1.5}
            shadowColor="rgba(0,0,0,0.5)"
            shadowBlur={4}
            shadowOffset={{ x: 0, y: 2 }}
            shadowOpacity={0.4}
            perfectDrawEnabled={false}
            listening={false}
          />
        )}
      </Group>
    </>
  );
});
