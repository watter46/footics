'use client';

/**
 * drawing-toolbar.tsx
 * Floating & draggable drawing toolbar:
 *  - Select (V)
 *  - Straight Line (L)
 *  - Route Line (R)
 *  - Solid Arrow (A)
 *  - Dashed Arrow (D)
 *  - Zone (Z)
 *  - Free Zone (P)
 *  - Text (T)
 *  | (Group divider)
 *  - Continuous Drawing Lock
 *  - Eraser Mode (E)
 *  | (Group divider)
 *  - Reset (Delete all objects)
 *  | (Group divider)
 *  - Auto-fit Boundary Box
 */

import {
  Eraser,
  GripVertical,
  Lock,
  Maximize2,
  MousePointer,
  MoveRight,
  RotateCcw,
  Square,
  Type,
  Unlock,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useRef, useState } from 'react';
import type { DrawingTool } from '@/lib/types/tactical-unified';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';
import { XMediaPresetMenu } from './x-media-preset-menu';

function StraightLineIcon({
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
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="3" y1="19" x2="21" y2="5" />
    </svg>
  );
}

function RouteLineIcon({
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
      <line x1="6" y1="18" x2="18" y2="6" />
      <circle
        cx="5"
        cy="19"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="19"
        cy="5"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

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

function WavyArrowIcon({
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
      <path d="M2 12 C 5 7, 7 17, 10 12 C 13 7, 15 17, 18 12 H 22" />
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

function RingMarkerIcon({
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
      <ellipse cx="12" cy="14" rx="9" ry="5" strokeWidth={2} />
      <circle
        cx="12"
        cy="9"
        r="3.5"
        strokeWidth={1.5}
        fill="currentColor"
        fillOpacity={0.2}
      />
    </svg>
  );
}

const PRIMARY_TOOLS: {
  tool: DrawingTool;
  icon: React.ElementType;
  label: string;
}[] = [
  { tool: 'select', icon: MousePointer, label: 'Select (V)' },
  { tool: 'line', icon: StraightLineIcon, label: 'Straight Line (L)' },
  {
    tool: 'route_line',
    icon: RouteLineIcon,
    label: 'Route Line (R)',
  },
  { tool: 'arrow_solid', icon: MoveRight, label: 'Solid Arrow (A)' },
  { tool: 'arrow_dash', icon: DashedArrowIcon, label: 'Dashed Arrow (D)' },
  {
    tool: 'arrow_wavy',
    icon: WavyArrowIcon,
    label: 'Wavy Arrow / Dribble (W)',
  },
  { tool: 'zone_circle', icon: Square, label: 'Zone (Z)' },
  {
    tool: 'polygon_zone',
    icon: CustomPolygonZoneIcon,
    label: 'Free Zone (P)',
  },
  { tool: 'text', icon: Type, label: 'Text (T)' },
  {
    tool: 'player-ring',
    icon: RingMarkerIcon,
    label: '3D Foot Ring (O)',
  },
];

export function DrawingToolbar() {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useTacticalUnifiedStore(
    (s) => s.toggleContinuousDrawing,
  );
  const autoFitBoundaryBox = useTacticalUnifiedStore(
    (s) => s.autoFitBoundaryBox,
  );
  const resetSlideObjects = useTacticalUnifiedStore((s) => s.resetSlideObjects);

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
      className="absolute bottom-4 left-1/2 z-40 flex items-center gap-1 px-2 py-1.5 rounded-xl bg-black/85 backdrop-blur-md border border-white/15 shadow-2xl select-none cursor-grab active:cursor-grabbing touch-none"
    >
      <div
        className="text-white/40 hover:text-white/80 p-0.5 cursor-grab active:cursor-grabbing"
        title="Drag to reposition toolbar"
      >
        <GripVertical size={14} />
      </div>

      {/* ── Primary Drawing Tools ── */}
      {PRIMARY_TOOLS.map(({ tool, icon: Icon, label }) => (
        <button
          type="button"
          key={tool}
          onClick={() => setActiveTool(tool)}
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

      {/* ── Divider: Continuous Lock & Eraser ── */}
      <div className="w-px h-5 bg-white/20 mx-1" />

      {/* Continuous Drawing Lock */}
      <button
        type="button"
        onClick={toggleContinuousDrawing}
        title={
          continuousDrawing
            ? 'Continuous Draw: ON (Stays in drawing mode after creation)'
            : 'Continuous Draw: OFF (Click to toggle)'
        }
        aria-label="Continuous Draw Lock"
        className={[
          'p-2 rounded-lg transition-all cursor-pointer flex items-center gap-1',
          continuousDrawing
            ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        {continuousDrawing ? <Lock size={15} /> : <Unlock size={15} />}
      </button>

      {/* Eraser Mode */}
      <button
        type="button"
        onClick={() => setActiveTool('eraser')}
        title="Eraser Mode (Drag to erase objects) (E)"
        aria-label="Eraser Mode"
        className={[
          'p-2 rounded-lg transition-all cursor-pointer',
          activeTool === 'eraser'
            ? 'bg-red-600 text-white shadow-md shadow-red-500/30 ring-1 ring-red-400'
            : 'text-white/60 hover:text-white hover:bg-white/10',
        ].join(' ')}
      >
        <Eraser size={15} />
      </button>

      {/* ── Divider: Reset ── */}
      <div className="w-px h-5 bg-white/20 mx-1" />

      {/* Reset all objects */}
      <button
        type="button"
        onClick={() => {
          if (
            window.confirm(
              'Are you sure you want to reset and delete all drawing objects on this slide?',
            )
          ) {
            resetSlideObjects();
          }
        }}
        title="Reset all slide objects"
        aria-label="Reset all slide objects"
        className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-white/10 transition-all cursor-pointer"
      >
        <RotateCcw size={15} />
      </button>

      {/* ── Divider: Bounds & Ratio ── */}
      <div className="w-px h-5 bg-white/20 mx-1" />

      {/* X Media Ratio Preset Menu */}
      <XMediaPresetMenu />

      {/* Auto-fit Boundary Box */}
      <button
        type="button"
        onClick={() => autoFitBoundaryBox()}
        title="Auto-fit boundary box to pitch"
        aria-label="Auto-fit boundary box"
        className="p-2 rounded-lg text-white/60 hover:text-blue-400 hover:bg-white/10 transition-all cursor-pointer"
      >
        <Maximize2 size={15} />
      </button>
    </div>
  );
}
