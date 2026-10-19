'use client';

import { Eraser } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';

export function ToolbarEraser() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const isEraser = activeTool === 'eraser';

  return (
    <button
      type="button"
      onClick={() => setActiveTool(isEraser ? 'select' : 'eraser')}
      title={
        isEraser
          ? 'Eraser: ON (Drag over objects to erase)'
          : 'Eraser: OFF (Click to toggle)'
      }
      aria-label="Eraser Mode"
      className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
        isEraser
          ? 'bg-rose-600 text-white shadow-md shadow-rose-500/30 ring-1 ring-rose-400'
          : 'text-white/80 hover:text-white hover:bg-[#333333]'
      }`}
    >
      <Eraser size={16} />
    </button>
  );
}
