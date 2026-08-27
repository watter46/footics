'use client';

/**
 * ball-object.tsx
 * Draggable realistic 3D soccer ball on the pitch
 */

import React, { useEffect, useState } from 'react';
import { Circle, Group, Image as KonvaImage } from 'react-konva';
import { getSoccerBallImage } from '@/lib/tactical/soccer-ball-svg';
import type { BallState } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import type { CanvasNodesRegistry } from './canvas-registry';
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
  const setBallPosition = useTacticalUnifiedStore((s) => s.setBallPosition);
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);

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

  return (
    <Group
      ref={(node) => {
        if (nodesRegistryRef) {
          nodesRegistryRef.current.ballNode = node;
        }
      }}
      x={px}
      y={py}
      draggable
      dragBoundFunc={(pos) => ({
        x: Math.max(0, Math.min(stageSize.width, pos.x)),
        y: Math.max(0, Math.min(stageSize.height, pos.y)),
      })}
      onDragStart={(e) => {
        const node = e.currentTarget;
        node.scale({ x: 1.25, y: 1.25 });
        node.moveToTop();
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'grabbing';
      }}
      onDragEnd={(e) => {
        const node = e.currentTarget;
        node.scale({ x: 1, y: 1 });
        const stage = node.getStage();
        if (stage) stage.container().style.cursor = 'default';
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
  );
});
