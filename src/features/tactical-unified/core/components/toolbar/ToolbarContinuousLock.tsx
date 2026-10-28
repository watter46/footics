'use client';

import { Pin } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarContinuousLock() {
  const continuousDrawing = useCanvasStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useCanvasStore(
    (s) => s.toggleContinuousDrawing,
  );

  return (
    <IconButton
      onClick={toggleContinuousDrawing}
      isActive={continuousDrawing}
      variant="ghost"
      size="sm"
      title={
        continuousDrawing
          ? 'Continuous Draw: ON (Stays in drawing mode after creation)'
          : 'Continuous Draw: OFF (Click to toggle)'
      }
      aria-label="Continuous Draw Lock"
      className="shrink-0"
    >
      <Pin size={16} />
    </IconButton>
  );
}
