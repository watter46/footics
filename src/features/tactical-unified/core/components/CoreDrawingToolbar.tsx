'use client';

import type { ReactNode } from 'react';
import { useCanvasStore } from '../hooks/use-canvas-store';
import {
  DraggableToolbar,
  type DrawingToolPlugin,
  getDrawingTools,
  ToolbarBoundaryBoxToggle,
  ToolbarContinuousLock,
  ToolbarDivider,
  ToolbarEraser,
  ToolbarPitchLock,
  ToolbarResetButton,
  ToolbarToolsGroup,
} from './toolbar';

export interface CoreDrawingToolbarProps {
  className?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
  tools?: DrawingToolPlugin[];
  showPitchLock?: boolean;
}

export function CoreDrawingToolbar({
  className = '',
  markerMode = '2d-only',
  tools,
  showPitchLock,
}: CoreDrawingToolbarProps): ReactNode {
  const hasPitchLock = useCanvasStore(
    (s) => s.capabilities?.hasPitchLock ?? true,
  );
  const resolvedTools = tools ?? getDrawingTools(markerMode);
  const shouldShowPitchLock = showPitchLock ?? hasPitchLock;

  return (
    <DraggableToolbar className={`right-3 ${className}`.trim()}>
      <ToolbarToolsGroup tools={resolvedTools} />
      <ToolbarDivider />
      <ToolbarContinuousLock />
      <ToolbarEraser />
      {shouldShowPitchLock && <ToolbarPitchLock />}
      <ToolbarBoundaryBoxToggle />
      <ToolbarDivider />
      <ToolbarResetButton />
    </DraggableToolbar>
  );
}
