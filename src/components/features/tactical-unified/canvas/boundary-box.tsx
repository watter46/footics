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
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import { normToPx, pxToNorm } from './unified-canvas';

interface BoundaryBoxProps {
  boundaryBox?: BoundaryBoxType;
  stageSize: { width: number; height: number };
  onUpdate: (box: BoundaryBoxType) => void;
  isExporting?: boolean;
}

export const BoundaryBox = React.memo(function BoundaryBox({
  boundaryBox,
  stageSize,
  onUpdate,
  isExporting = false,
}: BoundaryBoxProps) {
  const { width, height } = stageSize;

  // Default to full canvas if not set
  const box: BoundaryBoxType = boundaryBox ?? {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
  };

  const pxX = normToPx(box.x, width);
  const pxY = normToPx(box.y, height);
  const pxW = normToPx(box.width, width);
  const pxH = normToPx(box.height, height);

  // 4 corners
  const corners = [
    { id: 'tl', x: pxX, y: pxY },
    { id: 'tr', x: pxX + pxW, y: pxY },
    { id: 'br', x: pxX + pxW, y: pxY + pxH },
    { id: 'bl', x: pxX, y: pxY + pxH },
  ];

  const handleCornerDrag = useCallback(
    (cornerId: string, e: any) => {
      const node = e.target;
      const curX = node.x();
      const curY = node.y();

      let newX = pxX;
      let newY = pxY;
      let newW = pxW;
      let newH = pxH;

      if (cornerId === 'tl') {
        newX = Math.min(curX, pxX + pxW - 20);
        newY = Math.min(curY, pxY + pxH - 20);
        newW = pxX + pxW - newX;
        newH = pxY + pxH - newY;
      } else if (cornerId === 'tr') {
        newY = Math.min(curY, pxY + pxH - 20);
        newW = Math.max(20, curX - pxX);
        newH = pxY + pxH - newY;
      } else if (cornerId === 'br') {
        newW = Math.max(20, curX - pxX);
        newH = Math.max(20, curY - pxY);
      } else if (cornerId === 'bl') {
        newX = Math.min(curX, pxX + pxW - 20);
        newW = pxX + pxW - newX;
        newH = Math.max(20, curY - pxY);
      }

      onUpdate({
        x: pxToNorm(newX, width),
        y: pxToNorm(newY, height),
        width: pxToNorm(newW, width),
        height: pxToNorm(newH, height),
        enabled: true,
      });
    },
    [pxX, pxY, pxW, pxH, width, height, onUpdate],
  );

  if (isExporting || !box.enabled) return null;

  return (
    <Group listening={true}>
      {/* 境界線枠 */}
      <Rect
        x={pxX}
        y={pxY}
        width={pxW}
        height={pxH}
        stroke="#38bdf8"
        strokeWidth={1.5}
        dash={[6, 4]}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* 4隅のドラッグハンドル */}
      {corners.map((c) => (
        <Circle
          key={c.id}
          x={c.x}
          y={c.y}
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
            if (stage) stage.container().style.cursor = 'nwse-resize';
          }}
          onMouseLeave={(e) => {
            const stage = e.target.getStage();
            if (stage) stage.container().style.cursor = 'default';
          }}
          onDragMove={(e) => handleCornerDrag(c.id, e)}
        />
      ))}
    </Group>
  );
});
