'use client';

import { Eraser } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarEraser() {
  const activeTool = useCanvasStore((s) => s.activeTool);
  const setActiveTool = useCanvasStore((s) => s.setActiveTool);
  const isEraser = activeTool === 'eraser';

  return (
    <IconButton
      onClick={() => setActiveTool(isEraser ? 'select' : 'eraser')}
      variant={isEraser ? 'danger' : 'ghost'}
      isActive={isEraser}
      size="sm"
      title={
        isEraser
          ? 'Eraser: ON (Drag over objects to erase)'
          : 'Eraser: OFF (Click to toggle)'
      }
      aria-label="Eraser Mode"
      className="shrink-0"
    >
      <Eraser size={16} />
    </IconButton>
  );
}
