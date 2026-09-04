'use client';

/**
 * boundary-box.tsx
 * Resizable Export Boundary Box with 4 corner drag handles.
 *
 * Features:
 *  - Visual crop rectangle for export
 *  - 4 corner drag handles to freely resize and move
 *  - Hidden automatically during export
 */

import React, { useCallback } from 'react';
import { Circle, Group, Rect } from 'react-konva';
import {
  type BoundaryBox as BoundaryBoxType,
  DEFAULT_BOUNDARY_BOX_4_5,
} from '@/lib/types/tactical-unified';
import { normToPx, pxToNorm } from './unified-canvas';

interface BoundaryBoxProps {
  boundaryBox?: BoundaryBoxType;
  stageSize: { width: number; height: number };
  onUpdate: (box: BoundaryBoxType) => void;
  isExporting?: boolean;
}

interface CornerHandleProps {
  id: string;
  x: number;
  y: number;
  onDrag: (id: string, e: any) => void;
}

const CornerHandle = React.memo(function CornerHandle({
  id,
  x,
  y,
  onDrag,
}: CornerHandleProps) {
  const cursor = id === 'tl' || id === 'br' ? 'nwse-resize' : 'nesw-resize';

  return (
    <Circle
      x={x}
      y={y}
      radius={6}
      fill="#ffffff"
      stroke="#0284c7"
      strokeWidth={2}
      shadowColor="rgba(0,0,0,0.5)"
      shadowBlur={3}
      draggable
      perfectDrawEnabled={false}
      onMouseEnter={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = cursor;
      }}
      onMouseLeave={(e) => {
        const stage = e.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
      onDragStart={(e) => {
        e.cancelBubble = true;
      }}
      onDragMove={(e) => {
        e.cancelBubble = true;
        onDrag(id, e);
      }}
      onDragEnd={(e) => {
        e.cancelBubble = true;
        onDrag(id, e);
      }}
    />
  );
});

function calculateCornerResize(
  cornerId: string,
  curX: number,
  curY: number,
  pxX: number,
  pxY: number,
  pxW: number,
  pxH: number,
) {
  if (cornerId === 'tl') {
    const clampedCurX = Math.min(curX, pxW - 20);
    const clampedCurY = Math.min(curY, pxH - 20);
    return {
      newX: pxX + clampedCurX,
      newY: pxY + clampedCurY,
      newW: pxW - clampedCurX,
      newH: pxH - clampedCurY,
    };
  }
  if (cornerId === 'tr') {
    const clampedCurX = Math.max(20, curX);
    const clampedCurY = Math.min(curY, pxH - 20);
    return {
      newX: pxX,
      newY: pxY + clampedCurY,
      newW: clampedCurX,
      newH: pxH - clampedCurY,
    };
  }
  if (cornerId === 'br') {
    const clampedCurX = Math.max(20, curX);
    const clampedCurY = Math.max(20, curY);
    return {
      newX: pxX,
      newY: pxY,
      newW: clampedCurX,
      newH: clampedCurY,
    };
  }
  // cornerId === 'bl'
  const clampedCurX = Math.min(curX, pxW - 20);
  const clampedCurY = Math.max(20, curY);
  return {
    newX: pxX + clampedCurX,
    newY: pxY,
    newW: pxW - clampedCurX,
    newH: clampedCurY,
  };
}

function calculateGroupDrag(
  curX: number,
  curY: number,
  width: number,
  height: number,
) {
  return {
    normX: pxToNorm(curX, width),
    normY: pxToNorm(curY, height),
  };
}

interface BoundaryBoxFrameProps {
  pxW: number;
  pxH: number;
  onCornerDrag: (id: string, e: any) => void;
}

const BoundaryBoxFrame = React.memo(function BoundaryBoxFrame({
  pxW,
  pxH,
  onCornerDrag,
}: BoundaryBoxFrameProps) {
  const corners = [
    { id: 'tl', x: 0, y: 0 },
    { id: 'tr', x: pxW, y: 0 },
    { id: 'br', x: pxW, y: pxH },
    { id: 'bl', x: 0, y: pxH },
  ];

  return (
    <>
      {/* 境界線枠（エクスポート範囲） - 境界線自体を掴んだ時のみドラッグ可能 */}
      <Rect
        x={0}
        y={0}
        width={pxW}
        height={pxH}
        stroke="#38bdf8"
        strokeWidth={1.5}
        hitStrokeWidth={8}
        dash={[6, 4]}
        listening={true}
        perfectDrawEnabled={false}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'move';
        }}
        onMouseLeave={(e) => {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = 'default';
        }}
      />

      {/* 4隅のドラッグハンドル - Group直下で境界線とリアルタイム完全同期 */}
      {corners.map((c) => (
        <CornerHandle
          key={c.id}
          id={c.id}
          x={c.x}
          y={c.y}
          onDrag={onCornerDrag}
        />
      ))}
    </>
  );
});

export const BoundaryBox = React.memo(function BoundaryBox({
  boundaryBox,
  stageSize,
  onUpdate,
  isExporting = false,
}: BoundaryBoxProps) {
  const { width, height } = stageSize;

  // Default to pitch line fit boundary box if not set
  const box: BoundaryBoxType = boundaryBox ?? DEFAULT_BOUNDARY_BOX_4_5;

  const rawPxX = normToPx(box.x, width);
  const rawPxY = normToPx(box.y, height);
  const rawPxW = normToPx(box.width, width);
  const rawPxH = normToPx(box.height, height);

  // キャンバス領域外への自由な移動・リサイズを許容（最小幅・高さ20pxのみ担保）
  const pxX = rawPxX;
  const pxY = rawPxY;
  const pxW = Math.max(20, rawPxW);
  const pxH = Math.max(20, rawPxH);

  const handleCornerDrag = useCallback(
    (cornerId: string, e: any) => {
      e.cancelBubble = true;
      const node = e.target;
      const { newX, newY, newW, newH } = calculateCornerResize(
        cornerId,
        node.x(),
        node.y(),
        pxX,
        pxY,
        pxW,
        pxH,
      );

      onUpdate({
        ...box,
        x: pxToNorm(newX, width),
        y: pxToNorm(newY, height),
        width: pxToNorm(newW, width),
        height: pxToNorm(newH, height),
        enabled: true,
      });
    },
    [box, pxX, pxY, pxW, pxH, width, height, onUpdate],
  );

  const handleGroupDrag = useCallback(
    (e: any) => {
      if (e.target !== e.currentTarget) return;
      e.cancelBubble = true;
      if (width <= 0 || height <= 0) return;

      const { normX, normY } = calculateGroupDrag(
        e.target.x(),
        e.target.y(),
        width,
        height,
      );

      onUpdate({
        ...box,
        x: normX,
        y: normY,
        enabled: true,
      });
    },
    [box, width, height, onUpdate],
  );

  if (isExporting || !box.enabled) return null;

  return (
    <Group
      x={pxX}
      y={pxY}
      draggable
      listening={true}
      onDragStart={(e) => {
        if (e.target !== e.currentTarget) return;
        e.cancelBubble = true;
      }}
      onDragMove={handleGroupDrag}
      onDragEnd={handleGroupDrag}
    >
      <BoundaryBoxFrame pxW={pxW} pxH={pxH} onCornerDrag={handleCornerDrag} />
    </Group>
  );
});
