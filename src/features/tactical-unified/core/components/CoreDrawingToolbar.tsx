'use client';

import type { ReactNode } from 'react';
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
}

export function CoreDrawingToolbar({
  className = '',
  markerMode = '2d-only',
  tools,
}: CoreDrawingToolbarProps): ReactNode {
  const resolvedTools = tools ?? getDrawingTools(markerMode);
  const isExtension = markerMode === '3d-only';

  return (
    <DraggableToolbar className={`right-3 ${className}`.trim()}>
      <ToolbarToolsGroup tools={resolvedTools} />
      <ToolbarDivider />
      <ToolbarContinuousLock />
      <ToolbarEraser />
      {!isExtension && <ToolbarPitchLock />}
      <ToolbarBoundaryBoxToggle />
      <ToolbarDivider />
      <ToolbarResetButton />
    </DraggableToolbar>
  );
}
