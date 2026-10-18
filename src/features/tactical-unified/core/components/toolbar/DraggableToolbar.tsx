'use client';

import { GripVertical } from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';

export interface DraggableToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DraggableToolbar({
  children,
  className = '',
}: DraggableToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    isDragging: boolean;
  }>({
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    isDragging: false,
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      target.setPointerCapture(pointerId);

      const parent = toolbarRef.current?.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      const toolbarRect = toolbarRef.current?.getBoundingClientRect();

      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: position.x,
        origY: position.y,
        isDragging: true,
      };

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!dragRef.current.isDragging) return;
        const dx = moveEvent.clientX - dragRef.current.startX;
        const dy = moveEvent.clientY - dragRef.current.startY;
        let newX = dragRef.current.origX + dx;
        let newY = dragRef.current.origY + dy;

        // クランプ計算 (画面内からはみ出さない)
        if (parentRect && toolbarRect) {
          const parentWidth = parentRect.width;
          const parentHeight = parentRect.height;
          const tbWidth = toolbarRect.width;
          const tbHeight = toolbarRect.height;

          // 初期位置: right-3 (12px), top-1/2 (50% - tbHeight/2)
          // newX: 左端制限は -(parentWidth - tbWidth - 24), 右端制限は 12
          const minX = -(parentWidth - tbWidth - 24);
          const maxX = 12;
          const minY = -(parentHeight / 2 - tbHeight / 2 - 12);
          const maxY = parentHeight / 2 - tbHeight / 2 - 12;

          newX = Math.max(minX, Math.min(maxX, newX));
          newY = Math.max(minY, Math.min(maxY, newY));
        }

        setPosition({ x: newX, y: newY });
      };

      const handlePointerUp = (upEvent: PointerEvent) => {
        dragRef.current.isDragging = false;
        try {
          target.releasePointerCapture(upEvent.pointerId);
        } catch {
          // ignore
        }
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [position],
  );

  return (
    <div
      ref={toolbarRef}
      onPointerDown={handlePointerDown}
      style={{
        transform: `translate(${position.x}px, calc(-50% + ${position.y}px))`,
      }}
      className={`absolute right-3 top-1/2 z-40 max-h-[calc(100%-1.5rem)] overflow-y-auto no-scrollbar flex flex-col items-center gap-1 p-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl select-none cursor-grab active:cursor-grabbing touch-none ${className}`}
    >
      <div
        className="text-white/40 hover:text-white/80 p-0.5 cursor-grab active:cursor-grabbing shrink-0"
        title="Drag to reposition toolbar"
      >
        <GripVertical size={14} className="rotate-90" />
      </div>
      {children}
    </div>
  );
}
