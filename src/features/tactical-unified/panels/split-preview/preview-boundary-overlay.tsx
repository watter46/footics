'use client';

import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useState,
} from 'react';
import type { BoundaryBox } from '@/lib/types/tactical/slide';

type CornerId = 'tl' | 'tr' | 'bl' | 'br';

const CORNERS: { id: CornerId; cursor: string; style: CSSProperties }[] = [
  { id: 'tl', cursor: 'nwse-resize', style: { left: 0, top: 0 } },
  { id: 'tr', cursor: 'nesw-resize', style: { left: '100%', top: 0 } },
  { id: 'br', cursor: 'nwse-resize', style: { left: '100%', top: '100%' } },
  { id: 'bl', cursor: 'nesw-resize', style: { left: 0, top: '100%' } },
];

export interface PreviewBoundaryOverlayProps {
  boundaryBox: BoundaryBox;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onCommit: (box: BoundaryBox) => void;
}

export function PreviewBoundaryOverlay({
  boundaryBox,
  containerRef,
  onCommit,
}: PreviewBoundaryOverlayProps) {
  const [dragBox, setDragBox] = useState<BoundaryBox | null>(null);
  const currentBox = dragBox ?? boundaryBox;

  // ── 枠線ドラッグ移動 ──
  const handleBoxPointerDown = useCallback(
    (e: PointerEvent) => {
      if (e.button !== 0 || !containerRef.current) return;
      e.stopPropagation();
      e.preventDefault();

      const containerRect = containerRef.current.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const startPointerX = e.clientX;
      const startPointerY = e.clientY;
      const startBox = { ...boundaryBox };
      let latestBox = { ...startBox };

      const targetEl = e.currentTarget;
      try {
        targetEl.setPointerCapture(e.pointerId);
      } catch {
        // JSDOM fallback
      }

      const onMove = (moveEv: globalThis.PointerEvent | PointerEvent) => {
        const dxPercent =
          ((moveEv.clientX - startPointerX) / containerRect.width) * 100;
        const dyPercent =
          ((moveEv.clientY - startPointerY) / containerRect.height) * 100;

        const nextX = Math.max(
          0,
          Math.min(
            100 - startBox.width,
            Math.round((startBox.x + dxPercent) * 10) / 10,
          ),
        );
        const nextY = Math.max(
          0,
          Math.min(
            100 - startBox.height,
            Math.round((startBox.y + dyPercent) * 10) / 10,
          ),
        );

        latestBox = {
          ...startBox,
          x: nextX,
          y: nextY,
        };
        setDragBox(latestBox);
      };

      const onUp = (upEv: globalThis.PointerEvent | PointerEvent) => {
        try {
          targetEl.releasePointerCapture(
            (upEv as globalThis.PointerEvent).pointerId,
          );
        } catch {
          // JSDOM fallback
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        targetEl.removeEventListener('pointermove', onMove as EventListener);
        targetEl.removeEventListener('pointerup', onUp as EventListener);
        setDragBox(null);
        onCommit(latestBox);
      };

      targetEl.addEventListener('pointermove', onMove as EventListener);
      targetEl.addEventListener('pointerup', onUp as EventListener);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [boundaryBox, containerRef, onCommit],
  );

  // ── 4隅ハンドルリサイズ ──
  const handleCornerPointerDown = useCallback(
    (id: CornerId, e: PointerEvent) => {
      if (e.button !== 0 || !containerRef.current) return;
      e.stopPropagation();
      e.preventDefault();

      const containerRect = containerRef.current.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const startPointerX = e.clientX;
      const startPointerY = e.clientY;
      const startBox = { ...boundaryBox };
      let latestBox = { ...startBox };

      const targetEl = e.currentTarget;
      try {
        targetEl.setPointerCapture(e.pointerId);
      } catch {
        // JSDOM fallback
      }

      const onMove = (moveEv: globalThis.PointerEvent | PointerEvent) => {
        const dxPercent =
          ((moveEv.clientX - startPointerX) / containerRect.width) * 100;
        const dyPercent =
          ((moveEv.clientY - startPointerY) / containerRect.height) * 100;

        let x = startBox.x;
        let y = startBox.y;
        let width = startBox.width;
        let height = startBox.height;

        if (id === 'tl') {
          const maxX = startBox.x + startBox.width - 5;
          const maxY = startBox.y + startBox.height - 5;
          x = Math.max(
            0,
            Math.min(maxX, Math.round((startBox.x + dxPercent) * 10) / 10),
          );
          y = Math.max(
            0,
            Math.min(maxY, Math.round((startBox.y + dyPercent) * 10) / 10),
          );
          width = Math.round((startBox.x + startBox.width - x) * 10) / 10;
          height = Math.round((startBox.y + startBox.height - y) * 10) / 10;
        } else if (id === 'tr') {
          const maxY = startBox.y + startBox.height - 5;
          y = Math.max(
            0,
            Math.min(maxY, Math.round((startBox.y + dyPercent) * 10) / 10),
          );
          width = Math.max(
            5,
            Math.min(
              100 - startBox.x,
              Math.round((startBox.width + dxPercent) * 10) / 10,
            ),
          );
          height = Math.round((startBox.y + startBox.height - y) * 10) / 10;
        } else if (id === 'br') {
          width = Math.max(
            5,
            Math.min(
              100 - startBox.x,
              Math.round((startBox.width + dxPercent) * 10) / 10,
            ),
          );
          height = Math.max(
            5,
            Math.min(
              100 - startBox.y,
              Math.round((startBox.height + dyPercent) * 10) / 10,
            ),
          );
        } else if (id === 'bl') {
          const maxX = startBox.x + startBox.width - 5;
          x = Math.max(
            0,
            Math.min(maxX, Math.round((startBox.x + dxPercent) * 10) / 10),
          );
          width = Math.round((startBox.x + startBox.width - x) * 10) / 10;
          height = Math.max(
            5,
            Math.min(
              100 - startBox.y,
              Math.round((startBox.height + dyPercent) * 10) / 10,
            ),
          );
        }

        latestBox = {
          ...startBox,
          x,
          y,
          width,
          height,
        };
        setDragBox(latestBox);
      };

      const onUp = (upEv: globalThis.PointerEvent | PointerEvent) => {
        try {
          targetEl.releasePointerCapture(
            (upEv as globalThis.PointerEvent).pointerId,
          );
        } catch {
          // JSDOM fallback
        }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        targetEl.removeEventListener('pointermove', onMove as EventListener);
        targetEl.removeEventListener('pointerup', onUp as EventListener);
        setDragBox(null);
        onCommit(latestBox);
      };

      targetEl.addEventListener('pointermove', onMove as EventListener);
      targetEl.addEventListener('pointerup', onUp as EventListener);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [boundaryBox, containerRef, onCommit],
  );

  return (
    <>
      {/* 外側半透明暗転マスク (Mask Overlay) */}
      <svg
        data-testid="boundary-mask-overlay"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d={`M 0 0 H 100 V 100 H 0 Z M ${currentBox.x} ${currentBox.y} V ${currentBox.y + currentBox.height} H ${currentBox.x + currentBox.width} V ${currentBox.y} Z`}
          fill="rgba(0, 0, 0, 0.6)"
          fillRule="evenodd"
        />
      </svg>

      {/* 境界線操作枠 & 4隅ハンドル (BoundaryBoxOverlay) */}
      <div
        data-testid="boundary-box-overlay"
        className="absolute z-20 pointer-events-none"
        style={{
          left: `${currentBox.x}%`,
          top: `${currentBox.y}%`,
          width: `${currentBox.width}%`,
          height: `${currentBox.height}%`,
        }}
      >
        {/* 枠線ドラッグ移動用エリア */}
        <div
          data-testid="boundary-box-drag-handle"
          role="button"
          tabIndex={-1}
          aria-label="境界線移動"
          onPointerDown={handleBoxPointerDown}
          className="absolute inset-0 border-2 border-dashed border-sky-400 cursor-move pointer-events-auto"
        />

        {/* 4隅リサイズハンドル */}
        {CORNERS.map(({ id, cursor, style }) => (
          <div
            key={id}
            role="button"
            tabIndex={-1}
            aria-label={`リサイズハンドル ${id}`}
            data-testid={`boundary-corner-${id}`}
            onPointerDown={(e) => handleCornerPointerDown(id, e)}
            className="absolute w-3.5 h-3.5 rounded-full bg-white border-2 border-sky-600 shadow-md cursor-pointer pointer-events-auto touch-none -translate-x-1/2 -translate-y-1/2"
            style={{ ...style, cursor }}
          />
        ))}
      </div>
    </>
  );
}
