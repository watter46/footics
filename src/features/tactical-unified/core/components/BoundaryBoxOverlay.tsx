'use client';

import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';
import type { BoundaryBox } from '@/lib/types/tactical';

interface BoundaryBoxOverlayProps {
  boundaryBox: BoundaryBox;
  activePhaseId: string | null;
  vRect: { x: number; y: number; width: number; height: number };
}

const RESIZE_HANDLES = [
  { corner: 'nw', posClass: '-left-1.5 -top-1.5 cursor-nwse-resize' },
  { corner: 'ne', posClass: '-right-1.5 -top-1.5 cursor-nesw-resize' },
  { corner: 'sw', posClass: '-bottom-1.5 -left-1.5 cursor-nesw-resize' },
  { corner: 'se', posClass: '-bottom-1.5 -right-1.5 cursor-nwse-resize' },
] as const;

const MIN_SIZE = 5;

export function BoundaryBoxOverlay({
  boundaryBox,
  activePhaseId,
  vRect,
}: BoundaryBoxOverlayProps) {
  const dispatch = useDocumentStore((s) => s.dispatch);

  return (
    <div
      data-testid="canvas-boundary-box-overlay"
      className="pointer-events-none absolute border-2 border-dashed border-zinc-400"
      style={{
        left: vRect.x + (boundaryBox.x / 100) * vRect.width,
        top: vRect.y + (boundaryBox.y / 100) * vRect.height,
        width: (boundaryBox.width / 100) * vRect.width,
        height: (boundaryBox.height / 100) * vRect.height,
        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
      }}
    >
      {RESIZE_HANDLES.map(({ corner, posClass }) => (
        <div
          key={corner}
          data-testid={`boundary-resize-handle-${corner}`}
          className={`pointer-events-auto absolute h-3 w-3 rounded-sm border border-zinc-600 bg-zinc-300 ${posClass}`}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (!activePhaseId) return;
            const startX = e.clientX;
            const startY = e.clientY;
            const startBox = {
              x: boundaryBox.x,
              y: boundaryBox.y,
              width: boundaryBox.width,
              height: boundaryBox.height,
            };

            const handleWindowPointerMove = (moveEvent: PointerEvent) => {
              const dxPct = ((moveEvent.clientX - startX) / vRect.width) * 100;
              const dyPct = ((moveEvent.clientY - startY) / vRect.height) * 100;

              let nextX = startBox.x;
              let nextY = startBox.y;
              let nextWidth = startBox.width;
              let nextHeight = startBox.height;

              if (corner === 'nw' || corner === 'sw') {
                const right = startBox.x + startBox.width;
                nextX = Math.max(
                  0,
                  Math.min(startBox.x + dxPct, right - MIN_SIZE),
                );
                nextWidth = right - nextX;
              } else {
                nextWidth = Math.max(
                  MIN_SIZE,
                  Math.min(startBox.width + dxPct, 100 - startBox.x),
                );
              }

              if (corner === 'nw' || corner === 'ne') {
                const bottom = startBox.y + startBox.height;
                nextY = Math.max(
                  0,
                  Math.min(startBox.y + dyPct, bottom - MIN_SIZE),
                );
                nextHeight = bottom - nextY;
              } else {
                nextHeight = Math.max(
                  MIN_SIZE,
                  Math.min(startBox.height + dyPct, 100 - startBox.y),
                );
              }

              dispatch({
                type: 'UPDATE_PHASE',
                phaseId: activePhaseId,
                patch: {
                  boundaryBox: {
                    ...boundaryBox,
                    x: nextX,
                    y: nextY,
                    width: nextWidth,
                    height: nextHeight,
                  },
                },
              });
            };

            const handleWindowPointerUp = () => {
              window.removeEventListener(
                'pointermove',
                handleWindowPointerMove,
              );
              window.removeEventListener('pointerup', handleWindowPointerUp);
            };

            window.addEventListener('pointermove', handleWindowPointerMove);
            window.addEventListener('pointerup', handleWindowPointerUp);
          }}
        />
      ))}
    </div>
  );
}
