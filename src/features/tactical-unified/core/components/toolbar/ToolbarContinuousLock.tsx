'use client';

import { Pin } from 'lucide-react';
import { useCanvasStore } from '../../hooks/use-canvas-store';

export function ToolbarContinuousLock() {
  const continuousDrawing = useCanvasStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useCanvasStore(
    (s) => s.toggleContinuousDrawing,
  );

  return (
    <button
      type="button"
      onClick={toggleContinuousDrawing}
      title={
        continuousDrawing
          ? 'Continuous Draw: ON (Stays in drawing mode after creation)'
          : 'Continuous Draw: OFF (Click to toggle)'
      }
      aria-label="Continuous Draw Lock"
      className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
        continuousDrawing
          ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      }`}
    >
      <Pin size={16} />
    </button>
  );
}
