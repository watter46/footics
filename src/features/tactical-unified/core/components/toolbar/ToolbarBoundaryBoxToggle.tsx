'use client';

import { Crop } from 'lucide-react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarBoundaryBoxToggle() {
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const isVisible = boundaryBox.visible;

  return (
    <button
      type="button"
      onClick={() => setBoundaryBox({ ...boundaryBox, visible: !isVisible })}
      title={
        isVisible
          ? 'Hide Boundary Box (Crop Frame)'
          : 'Show Boundary Box (Crop Frame)'
      }
      aria-label="Toggle Boundary Box"
      className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
        isVisible
          ? 'bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-1 ring-sky-400'
          : 'text-white/80 hover:text-white hover:bg-[#333333]'
      }`}
    >
      <Crop size={16} />
    </button>
  );
}
