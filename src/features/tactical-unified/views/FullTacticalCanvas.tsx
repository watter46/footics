'use client';

import { forwardRef, type ReactNode, useMemo } from 'react';
import { createTacticalCanvasStoreAdapter } from '@/features/tactical-unified/adapters/tactical-canvas-store-adapter';
import {
  type CanvasCoreHandle,
  CanvasStageContainer,
  CanvasStoreProvider,
} from '@/features/tactical-unified/core';
import { DrawingToolbar } from '@/features/tactical-unified/panels/toolbar/drawing-toolbar';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export interface FullTacticalCanvasProps {
  className?: string;
  imageAspect?: number;
  toolbar?: ReactNode;
}

export const FullTacticalCanvas = forwardRef<
  CanvasCoreHandle,
  FullTacticalCanvasProps
>(function FullTacticalCanvas(
  { className = '', imageAspect = 16 / 9, toolbar },
  ref,
) {
  // マスターストア（useTacticalUnifiedStore）を唯一の真実源としてアダプター経由で接続
  const storeApi = useMemo(() => {
    return createTacticalCanvasStoreAdapter(useTacticalUnifiedStore);
  }, []);

  const resolvedToolbar = toolbar ?? <DrawingToolbar />;

  return (
    <CanvasStoreProvider store={storeApi}>
      <CanvasStageContainer
        ref={ref}
        className={className}
        imageAspect={imageAspect}
        toolbar={resolvedToolbar}
      />
    </CanvasStoreProvider>
  );
});
