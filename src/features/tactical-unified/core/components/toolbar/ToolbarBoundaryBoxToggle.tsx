'use client';

import { Crop } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarBoundaryBoxToggle() {
  const boundaryBox = useCanvasStore((s) => s.boundaryBox);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const isVisible = boundaryBox.visible;

  return (
    <IconButton
      onClick={() => setBoundaryBox({ ...boundaryBox, visible: !isVisible })}
      isActive={isVisible}
      variant="ghost"
      size="sm"
      title={
        isVisible
          ? 'Hide Boundary Box (Crop Frame)'
          : 'Show Boundary Box (Crop Frame)'
      }
      aria-label="Toggle Boundary Box"
      className="shrink-0"
    >
      <Crop size={16} />
    </IconButton>
  );
}
