'use client';

import type { ReactNode } from 'react';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import { BoundaryBoxOverlay } from './BoundaryBoxOverlay';

export interface ViewportCropOverlayProps {
  stageSize: { width: number; height: number };
  pitchRect?: PitchRectBounds;
  visible?: boolean;
  cleanRender?: boolean;
}

export function ViewportCropOverlay({
  stageSize,
  pitchRect,
  visible,
  cleanRender,
}: ViewportCropOverlayProps): ReactNode {
  if (cleanRender) return null;

  return (
    <BoundaryBoxOverlay
      width={stageSize.width}
      height={stageSize.height}
      pitchRect={pitchRect}
      visible={visible}
    />
  );
}
