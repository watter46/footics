'use client';

/**
 * drawing-toolbar.tsx
 * Floating & draggable drawing toolbar
 */

import {
  GripVertical,
  MousePointer,
  MoveRight,
  RotateCcw,
  Square,
  Type,
  User,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { DrawingTool } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

function DashedArrowIcon({
  size = 15,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12H22" strokeDasharray="3.5 2.5" />
      <path d="M18 8L22 12L18 16" />
    </svg>
  );
}

function CustomPolygonZoneIcon({
  size = 15,
  className,
}: {
  size?: number | string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon
        points="4 7 17 4 20 16 7 19"
        strokeWidth={1.75}
        fill="currentColor"
        fillOpacity={0.15}
      />
      <circle cx="4" cy="7" r="1.5" fill="currentColor" />
      <circle cx="17" cy="4" r="1.5" fill="currentColor" />
      <circle cx="20" cy="16" r="1.5" fill="currentColor" />
      <circle cx="7" cy="19" r="1.5" fill="currentColor" />
      <path
        d="M12 9l3 3-5 5-2-1 1-2 3-5z"
        strokeWidth={1.2}
        fill="currentColor"
        fillOpacity={0.25}
      />
    </svg>
  );
}

const TOOLS: { tool: DrawingTool; icon: React.ElementType; label: string }[] = [
  { tool: 'select', icon: MousePointer, label: '選択・コマ移動 (V)' },
  { tool: 'arrow_solid', icon: MoveRight, label: '実線矢印 (A)' },
  { tool: 'arrow_dash', icon: DashedArrowIcon, label: '点線矢印 (D)' },
  { tool: 'zone_circle', icon: Square, label: 'ゾーン (四角/楕円) (Z)' },
  { tool: 'polygon_zone', icon: CustomPolygonZoneIcon, label: 'フリーゾーン (P)' },
  { tool: 'text', icon: Type, label: 'テキスト (T)' },
  { tool: 'player', icon: User, label: '選手追加 (M)' },
  { tool: 'eraser', icon: RotateCcw, label: '描画クリア (E)' },
];

export function DrawingToolbar() {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const clearAnnotations = useTacticalUnifiedStore((s) => s.clearAnnotations);

  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
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
      // ボタン自体のクリック時はドラッグ開始しないようにする（ドラッグハンドルまたは隙間クリックでドラッグ）
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      const pointerId = e.pointerId;
      const target = e.currentTarget;
      target.setPointerCapture(pointerId);

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
        setPosition({
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
        });
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
      onPointerDown={handlePointerDown}
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`,
      }}
      className="absolute bottom-4 left-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-2xl select-none cursor-grab active:cursor-grabbing touch-none"
    >
      <div
        className="text-white/40 hover:text-white/80 p-0.5 cursor-grab active:cursor-grabbing"
        title="ドラッグして移動"
      >
        <GripVertical size={14} />
      </div>
      {TOOLS.map(({ tool, icon: Icon, label }) => (
        <button
          type="button"
          key={tool}
          onClick={() => {
            if (tool === 'eraser') {
              clearAnnotations(activeSlideId);
              setActiveTool('select');
            } else {
              setActiveTool(tool);
            }
          }}
          title={label}
          aria-label={label}
          className={[
            'p-2 rounded-lg transition-all cursor-pointer',
            activeTool === tool
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 ring-1 ring-blue-400'
              : 'text-white/60 hover:text-white hover:bg-white/10',
          ].join(' ')}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
