'use client';

import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import type { BoundaryBox as BoundaryBoxType } from '@/lib/types/tactical-unified';
import {
  type CornerId,
  useBoundaryBoxDrag,
} from '../hooks/use-boundary-box-drag';
import { useCanvasStore } from '../hooks/use-canvas-store';
import { resolveBoundaryBoxPixelRect } from '../utils/geometry';

export interface BoundaryBoxOverlayProps {
  width: number;
  height: number;
  visible?: boolean;
  pitchRect?: { x: number; y: number; width: number; height: number };
}

const CORNER_CURSORS: Record<CornerId, string> = {
  tl: 'nwse-resize',
  tr: 'nesw-resize',
  br: 'nwse-resize',
  bl: 'nesw-resize',
};

function CornerHandle({
  id,
  x,
  y,
  onPointerDown,
}: {
  id: CornerId;
  x: number;
  y: number;
  onPointerDown: (id: CornerId, e: React.PointerEvent) => void;
}) {
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
}

function BoundaryBoxOutline({
  width,
  height,
  onPointerDown,
}: {
  width: number;
  height: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width,
        height,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        style={{
          pointerEvents: 'stroke',
          cursor: 'move',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
      />
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke="#38bdf8"
        strokeWidth={1.5}
        strokeDasharray="6 4"
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  );
}

export function BoundaryBoxOverlay({
  width,
  height,
  visible,
  pitchRect,
}: BoundaryBoxOverlayProps): ReactNode {
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const [dragBox, setDragBox] = useState<BoundaryBoxType | null>(null);

  const box = dragBox ?? boundaryBox;
  const isVisible = visible ?? box.visible ?? true;

  const baseRect =
    pitchRect && pitchRect.width > 0 && pitchRect.height > 0
      ? pitchRect
      : { x: 0, y: 0, width, height };
  const resolved = resolveBoundaryBoxPixelRect(
    box,
    { width, height },
    pitchRect,
  );
  const pxX = resolved.x;
  const pxY = resolved.y;
  const pxW = Math.max(20, resolved.width);
  const pxH = Math.max(20, resolved.height);

  const handleDragUpdate = useCallback((nextBox: BoundaryBoxType) => {
    setDragBox(nextBox);
  }, []);

  const handleDragCommit = useCallback(
    (finalBox: BoundaryBoxType) => {
      setDragBox(null);
      setBoundaryBox(finalBox);
    },
    [setBoundaryBox],
  );

  const { handleCornerPointerDown, handleBoxPointerDown } = useBoundaryBoxDrag({
    box,
    baseRect,
    pxX,
    pxY,
    pxW,
    pxH,
    onUpdate: handleDragUpdate,
    onCommit: handleDragCommit,
  });

  if (!box.enabled || !isVisible) {
    return null;
  }

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
        width,
        height,
        pointerEvents: 'none',
        zIndex: 20,
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
        <BoundaryBoxOutline
          width={pxW}
          height={pxH}
          onPointerDown={handleBoxPointerDown}
        />
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
}
