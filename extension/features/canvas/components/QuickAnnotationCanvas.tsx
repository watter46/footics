'use client';

import type React from 'react';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  CanvasStageContainer,
  CanvasStoreProvider,
  DraggableToolbar,
  EXTENSION_DRAWING_TOOLS,
  ToolbarBoundaryBoxToggle,
  ToolbarContinuousLock,
  ToolbarDivider,
  ToolbarEraser,
  ToolbarResetButton,
  ToolbarToolsGroup,
  useCanvasStore,
} from '@/features/tactical-unified/core';
import type {
  CanvasConfig,
  CanvasCoreHandle,
} from '@/features/tactical-unified/core/types';
import {
  type AspectRatio,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '../../capture/db/screenshot-db';

export interface QuickAnnotationCanvasProps {
  screenshot: CapturedScreenshot;
  onAutoSave?: (annotationsJson: string) => void;
  className?: string;
  imageAspect?: number;
}

export type QuickAnnotationCanvasHandle = CanvasCoreHandle & {
  applyRatio?: (ratio: AspectRatio | 'full') => void;
};

function QuickAnnotationCanvasInner(
  {
    className = '',
    imageAspect = 16 / 9,
  }: {
    className?: string;
    imageAspect?: number;
  },
  ref: React.Ref<CanvasCoreHandle>,
) {
  const stageRef = useRef<CanvasCoreHandle | null>(null);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);

  useImperativeHandle(
    ref,
    () => ({
      exportPng: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.exportPng(opts);
      },
      copyToClipboard: (opts) => {
        if (!stageRef.current) throw new Error('Stage not ready');
        return stageRef.current.copyToClipboard(opts);
      },
      undo: () => stageRef.current?.undo(),
      redo: () => stageRef.current?.redo(),
      canUndo: () => stageRef.current?.canUndo() ?? false,
      canRedo: () => stageRef.current?.canRedo() ?? false,
      applyRatio: (ratio: AspectRatio | 'full') => {
        if (ratio === 'full') {
          setBoundaryBox({
            ...DEFAULT_BOUNDARY_BOX_FULL,
            enabled: true,
            visible: false,
          });
        } else {
          const newBox = createXBoundaryBox(ratio, '16:9');
          setBoundaryBox({
            ...newBox,
            enabled: true,
            visible: true,
          });
        }
      },
    }),
    [setBoundaryBox],
  );

  return (
    <CanvasStageContainer
      ref={stageRef}
      className={className}
      imageAspect={imageAspect}
      toolbar={
        <DraggableToolbar>
          <ToolbarToolsGroup tools={EXTENSION_DRAWING_TOOLS} />
          <ToolbarDivider />
          <ToolbarContinuousLock />
          <ToolbarEraser />
          <ToolbarDivider />
          <ToolbarBoundaryBoxToggle />
          <ToolbarResetButton />
        </DraggableToolbar>
      }
    />
  );
}

const ForwardedInner = forwardRef<
  CanvasCoreHandle,
  { className?: string; imageAspect?: number }
>(QuickAnnotationCanvasInner);

export const QuickAnnotationCanvas = forwardRef<
  CanvasCoreHandle,
  QuickAnnotationCanvasProps
>(function QuickAnnotationCanvas(
  { screenshot, onAutoSave, className = '', imageAspect = 16 / 9 },
  ref,
): React.ReactElement {
  const config = useMemo<CanvasConfig>(
    () => ({
      mode: 'screenshot-edit',
      backgroundImageUrl: screenshot.imageDataUrl,
      initialAnnotations: screenshot.canvasAnnotations,
      markerMode: '3d-only',
      defaultBoundaryBox: DEFAULT_BOUNDARY_BOX_FULL,
    }),
    [screenshot.imageDataUrl, screenshot.canvasAnnotations],
  );

  return (
    <CanvasStoreProvider config={config} onAutoSave={onAutoSave}>
      <ForwardedInner
        ref={ref}
        className={className}
        imageAspect={imageAspect}
      />
    </CanvasStoreProvider>
  );
});
