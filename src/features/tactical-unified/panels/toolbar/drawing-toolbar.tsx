'use client';

/**
 * drawing-toolbar.tsx
 * Web-layer toolbar component.
 * Renders CoreDrawingToolbar inside CanvasStoreContext provided by FullTacticalCanvas.
 */

import type { ReactNode } from 'react';
import { CoreDrawingToolbar } from '@/features/tactical-unified/core';

export interface DrawingToolbarProps {
  markerMode?: '2d-only' | '3d-only' | 'all';
  className?: string;
}

export function DrawingToolbar({
  markerMode = '2d-only',
  className = '',
}: DrawingToolbarProps = {}): ReactNode {
  return <CoreDrawingToolbar markerMode={markerMode} className={className} />;
}
