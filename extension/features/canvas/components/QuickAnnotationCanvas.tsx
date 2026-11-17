'use client';

import {
  forwardRef,
  type ReactElement,
  type Ref,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  CanvasStageContainer,
  CoreDrawingToolbar,
  EXTENSION_DRAWING_TOOLS,
} from '@/features/tactical-unified/core';
import type { CanvasCoreHandle } from '@/features/tactical-unified/core/types';
import {
  TacticalStoreProvider,
  TacticalStoresContext,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { translateScreenshotToProject } from '@/lib/tactical/acl/screenshot-translator';
import {
  type AspectRatio,
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';
import { useQuickAnnotationShortcuts } from '../hooks/use-quick-annotation-shortcuts';

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
    onAutoSave,
    className = '',
    imageAspect = 16 / 9,
  }: {
    onAutoSave?: (annotationsJson: string) => void;
    className?: string;
    imageAspect?: number;
  },
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const stageRef = useRef<CanvasCoreHandle | null>(null);
  const { documentStore, sessionStore } = useTacticalStoresContext();
  useQuickAnnotationShortcuts();

  useEffect(() => {
    let prevProject = documentStore.getState().project;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = documentStore.subscribe((state) => {
      if (state.project === prevProject) return;
      prevProject = state.project;
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        onAutoSave?.(JSON.stringify(state.project));
      }, 300);
    });
    return () => {
      unsubscribe();
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, [documentStore, onAutoSave]);

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
        const nextBox: BoundaryBox =
          ratio === 'full'
            ? {
                ...DEFAULT_BOUNDARY_BOX_FULL,
                enabled: true,
                visible: false,
              }
            : {
                ...createXBoundaryBox(ratio, '16:9'),
                enabled: true,
                visible: true,
              };

        const docState = documentStore.getState();
        const activePhaseId =
          sessionStore.getState().activePhaseId ||
          docState.project.phases[0]?.id;
        if (activePhaseId) {
          docState.dispatch({
            type: 'UPDATE_PHASE',
            phaseId: activePhaseId,
            patch: {
              boundaryBox: nextBox,
              ...(ratio !== 'full' ? { aspectRatio: ratio } : {}),
            },
          });
        }
      },
    }),
    [documentStore, sessionStore],
  );

  return (
    <CanvasStageContainer
      ref={stageRef}
      className={className}
      imageAspect={imageAspect}
      toolbar={
        <CoreDrawingToolbar
          tools={EXTENSION_DRAWING_TOOLS}
          showPitchLock={false}
        />
      }
    />
  );
}

const ForwardedInner = forwardRef<
  QuickAnnotationCanvasHandle,
  {
    onAutoSave?: (annotationsJson: string) => void;
    className?: string;
    imageAspect?: number;
  }
>(QuickAnnotationCanvasInner);

export const QuickAnnotationCanvas = forwardRef<
  QuickAnnotationCanvasHandle,
  QuickAnnotationCanvasProps
>(function QuickAnnotationCanvas(
  props: QuickAnnotationCanvasProps,
  ref,
): ReactElement {
  const {
    screenshot,
    onAutoSave,
    className = '',
    imageAspect = 16 / 9,
  } = props;
  const existingStores = useContext(TacticalStoresContext);
  const initialBundle = useMemo(
    () =>
      translateScreenshotToProject({
        screenshotId: screenshot.id,
        backgroundImageUrl: screenshot.imageDataUrl,
        canvasAnnotationsJson: screenshot.canvasAnnotations,
      }),
    [screenshot.id, screenshot.imageDataUrl, screenshot.canvasAnnotations],
  );

  if (existingStores) {
    return (
      <ForwardedInner
        ref={ref}
        onAutoSave={onAutoSave}
        className={className}
        imageAspect={imageAspect}
      />
    );
  }

  return (
    <TacticalStoreProvider
      initialProject={initialBundle.project}
      initialSession={{
        activePhaseId: initialBundle.activePhaseId,
        activeSlideId: initialBundle.activeSlideId,
      }}
    >
      <ForwardedInner
        ref={ref}
        onAutoSave={onAutoSave}
        className={className}
        imageAspect={imageAspect}
      />
    </TacticalStoreProvider>
  );
});
