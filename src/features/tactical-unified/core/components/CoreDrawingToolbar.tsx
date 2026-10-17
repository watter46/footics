'use client';

import {
  ArrowRight,
  CircleDot,
  Crop,
  MousePointer,
  Redo2,
  Square,
  Trash2,
  Type,
  Undo2,
  User,
  Waves,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';

export interface CoreDrawingToolbarProps {
  className?: string;
}

const PALETTE = [
  { label: 'Red', value: '#ef4444' },
  { label: 'Blue', value: '#3b82f6' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Green', value: '#10b981' },
  { label: 'White', value: '#ffffff' },
];

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`p-2 rounded-xl transition-all cursor-pointer ${
        active
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function ColorPaletteGroup({
  color,
  onSelectColor,
}: {
  color: string;
  onSelectColor: (c: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {PALETTE.map((p) => (
        <button
          key={p.value}
          type="button"
          title={p.label}
          aria-label={p.label}
          onClick={() => onSelectColor(p.value)}
          style={{ backgroundColor: p.value }}
          className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
            color === p.value
              ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
              : 'hover:scale-110 opacity-80 hover:opacity-100'
          }`}
        />
      ))}
    </div>
  );
}

export function CoreDrawingToolbar({
  className = '',
}: CoreDrawingToolbarProps): ReactNode {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const color = useCanvasStore((s) => s.color);
  const setColor = useCanvasStore((s) => s.setColor);
  const markerMode = useCanvasStore((s) => s.markerMode);
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const removeSelected = useCanvasStore((s) => s.removeSelected);
  const undo = useCanvasStore((s) => s.undo);
  const redo = useCanvasStore((s) => s.redo);
  const canUndo = useCanvasStore((s) => s.canUndo());
  const canRedo = useCanvasStore((s) => s.canRedo());

  return (
    <div
      className={`flex items-center gap-1.5 p-1.5 rounded-2xl bg-zinc-900/90 backdrop-blur-md border border-zinc-700/80 shadow-2xl select-none ${className}`}
    >
      <ToolButton
        active={activeTool === 'select'}
        onClick={() => setActiveTool('select')}
        title="Select & Move (V)"
      >
        <MousePointer size={18} />
      </ToolButton>

      <ToolButton
        active={activeTool === 'pass'}
        onClick={() => setActiveTool('pass')}
        title="Pass Arrow"
      >
        <ArrowRight size={18} />
      </ToolButton>

      <ToolButton
        active={activeTool === 'dribble'}
        onClick={() => setActiveTool('dribble')}
        title="Dribble Arrow"
      >
        <Waves size={18} />
      </ToolButton>

      <ToolButton
        active={activeTool === 'zone'}
        onClick={() => setActiveTool('zone')}
        title="Highlight Zone"
      >
        <Square size={18} />
      </ToolButton>

      <ToolButton
        active={activeTool === 'text'}
        onClick={() => setActiveTool('text')}
        title="Text"
      >
        <Type size={18} />
      </ToolButton>

      {markerMode !== '2d-only' && (
        <ToolButton
          active={activeTool === 'player-ring'}
          onClick={() => setActiveTool('player-ring')}
          title="3D Player Ring Marker"
        >
          <CircleDot size={18} />
        </ToolButton>
      )}

      {markerMode !== '3d-only' && (
        <ToolButton
          active={activeTool === 'player'}
          onClick={() => setActiveTool('player')}
          title="2D Player Marker"
        >
          <User size={18} />
        </ToolButton>
      )}

      <button
        type="button"
        title="Toggle Boundary Box"
        aria-label="Boundary Box tool"
        onClick={() =>
          setBoundaryBox({ ...boundaryBox, visible: !boundaryBox.visible })
        }
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          boundaryBox.visible
            ? 'bg-sky-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
        }`}
      >
        <Crop size={18} />
      </button>

      <div className="w-px h-6 bg-zinc-700 mx-1 shrink-0" />

      <ColorPaletteGroup color={color} onSelectColor={setColor} />

      <div className="w-px h-6 bg-zinc-700 mx-1 shrink-0" />

      <button
        type="button"
        title="Delete Selected"
        aria-label="Delete Selected tool"
        onClick={removeSelected}
        className="p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all cursor-pointer"
      >
        <Trash2 size={18} />
      </button>

      <button
        type="button"
        title="Undo (Ctrl+Z)"
        aria-label="Undo tool"
        disabled={!canUndo}
        onClick={undo}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          canUndo
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Undo2 size={18} />
      </button>

      <button
        type="button"
        title="Redo (Ctrl+Y)"
        aria-label="Redo tool"
        disabled={!canRedo}
        onClick={redo}
        className={`p-2 rounded-xl transition-all cursor-pointer ${
          canRedo
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
}
