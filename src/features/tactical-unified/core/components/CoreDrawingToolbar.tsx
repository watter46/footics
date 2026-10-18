'use client';

import type { ReactNode } from 'react';
import {
  DraggableToolbar,
  ToolbarBoundaryBoxToggle,
  ToolbarContinuousLock,
  ToolbarDivider,
  ToolbarEraser,
  ToolbarPitchLock,
  ToolbarResetButton,
  ToolbarToolsGroup,
  WEB_DRAWING_TOOLS,
} from './toolbar';

export interface CoreDrawingToolbarProps {
  className?: string;
}

export function CoreDrawingToolbar({
  className = '',
}: CoreDrawingToolbarProps): ReactNode {
  return (
    <DraggableToolbar className={className}>
      <ToolbarToolsGroup tools={WEB_DRAWING_TOOLS} />
      <ToolbarDivider />
      <ToolbarContinuousLock />
      <ToolbarEraser />
      <ToolbarPitchLock />
      <ToolbarBoundaryBoxToggle />
      <ToolbarDivider />
      <ToolbarResetButton />
    </DraggableToolbar>
  );
}
