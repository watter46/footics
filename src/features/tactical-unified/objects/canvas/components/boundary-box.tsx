'use client';

/**
 * boundary-box.tsx
 * DOM/SVG-based Resizable Export Boundary Box with 4 corner drag handles.
 *
 * Designed with pointer-events: none on container and pointer-events: auto on handles/stroke
 * to avoid blocking clicks and pointer events on the underlying Konva Stage.
 */

import React from 'react';
import {
  type BoundaryBox as BoundaryBoxType,
  DEFAULT_BOUNDARY_BOX_4_5,
} from '@/lib/types/tactical-unified';
import { normToPx } from '../helpers';
import { type CornerId, useBoundaryBoxDrag } from '../hooks';

export interface BoundaryBoxProps {
  boundaryBox?: BoundaryBoxType;
  stageSize: { width: number; height: number };
  pitchRect?: { x: number; y: number; width: number; height: number };
  onUpdate: (box: BoundaryBoxType) => void;
  isExporting?: boolean;
}

interface CornerHandleProps {
  id: CornerId;
  x: number;
  y: number;
  onPointerDown: (id: CornerId, e: React.PointerEvent) => void;
}

const CORNER_CURSORS: Record<CornerId, string> = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  br: 'nwse-resize',
  bl: 'nesw-resize',
};

const CornerHandle = React.memo(function CornerHandle({
  id,
  x,
  y,
  onPointerDown,
}: CornerHandleProps) {
  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={`Resize handle ${id}`}
      style={{
        position: 'absolute',
        left: x - 6,
        top: y - 6,
        width: 12,
        height: 12,
        borderRadius: '50%',
        backgroundColor: '#ffffff',
        border: '2px solid #0284c7',
        boxShadow: '0 1px 3px rgba(0,0,0,0.5)',
        cursor: CORNER_CURSORS[id],
        pointerEvents: 'auto',
        touchAction: 'none',
      }}
      onPointerDown={(e) => onPointerDown(id, e)}
    />
  );
});

export const BoundaryBox = React.memo(function BoundaryBox({
  boundaryBox,
  stageSize,
  pitchRect,
  onUpdate,
  isExporting = false,
}: BoundaryBoxProps) {
  const box: BoundaryBoxType = boundaryBox ?? DEFAULT_BOUNDARY_BOX_4_5;

  const baseRect =
    box.fitTarget === 'canvas'
      ? { x: 0, y: 0, width: stageSize.width, height: stageSize.height }
      : (pitchRect ?? {
          x: 0,
          y: 0,
          width: stageSize.width,
          height: stageSize.height,
        });

  const pxX = baseRect.x + normToPx(box.x, baseRect.width);
  const pxY = baseRect.y + normToPx(box.y, baseRect.height);
  const pxW = Math.max(20, normToPx(box.width, baseRect.width));
  const pxH = Math.max(20, normToPx(box.height, baseRect.height));

  const { handleCornerPointerDown, handleBoxPointerDown } = useBoundaryBoxDrag({
    box,
    baseRect,
    pxX,
    pxY,
    pxW,
    pxH,
    onUpdate,
  });

  if (isExporting || !box.enabled) return null;

  const corners: { id: CornerId; x: number; y: number }[] = [
    { id: 'tl', x: 0, y: 0 },
    { id: 'tr', x: pxW, y: 0 },
    { id: 'br', x: pxW, y: pxH },
    { id: 'bl', x: 0, y: pxH },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: stageSize.width,
        height: stageSize.height,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: pxX,
          top: pxY,
          width: pxW,
          height: pxH,
          pointerEvents: 'none',
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: pxW,
            height: pxH,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {/* Hit area for dragging whole box */}
          <rect
            x={0}
            y={0}
            width={pxW}
            height={pxH}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
            style={{
              pointerEvents: 'stroke',
              cursor: 'move',
              touchAction: 'none',
            }}
            onPointerDown={handleBoxPointerDown}
          />
          {/* Visible dashed boundary line */}
          <rect
            x={0}
            y={0}
            width={pxW}
            height={pxH}
            fill="none"
            stroke="#38bdf8"
            strokeWidth={1.5}
            strokeDasharray="6 4"
            style={{ pointerEvents: 'none' }}
          />
        </svg>

        {corners.map((c) => (
          <CornerHandle
            key={c.id}
            id={c.id}
            x={c.x}
            y={c.y}
            onPointerDown={handleCornerPointerDown}
          />
        ))}
      </div>
    </div>
  );
});
