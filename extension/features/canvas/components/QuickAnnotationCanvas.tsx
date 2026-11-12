'use client';

import {
  forwardRef,
  type ReactElement,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import {
  CanvasStageContainer,
  CanvasStoreProvider,
  CoreDrawingToolbar,
  EXTENSION_DRAWING_TOOLS,
  useCanvasStore,
} from '@/features/tactical-unified/core';
import type {
  CanvasConfig,
  CanvasCoreHandle,
} from '@/features/tactical-unified/core/types';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  serializeProjectToScreenshotJson,
  translateScreenshotToProject,
} from '@/lib/tactical/acl/screenshot-translator';
import {
  type AspectRatio,
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_FULL,
} from '@/lib/types/tactical-unified';
import type { CapturedScreenshot } from '~/features/capture/db/screenshot-db';

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
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const stageRef = useRef<CanvasCoreHandle | null>(null);
  const setBoundaryBox = useCanvasStore((s) => s.setBoundaryBox);
  const { documentStore, sessionStore } = useTacticalStoresContext();

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
        setBoundaryBox(nextBox);
      },
    }),
    [setBoundaryBox, documentStore, sessionStore],
  );

  return (
    <CanvasStageContainer
      ref={stageRef}
      className={className}
      imageAspect={imageAspect}
      toolbar={<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} />}
    />
  );
}

const ForwardedInner = forwardRef<
  QuickAnnotationCanvasHandle,
  { className?: string; imageAspect?: number }
>(QuickAnnotationCanvasInner);

function QuickAnnotationCanvasBridge(
  {
    screenshot,
    onAutoSave,
    className = '',
    imageAspect = 16 / 9,
  }: QuickAnnotationCanvasProps,
  ref: Ref<QuickAnnotationCanvasHandle>,
) {
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const isSyncingFromCanvasRef = useRef(false);

  useEffect(() => {
    let prevProject = documentStore.getState().project;
    return documentStore.subscribe((state) => {
      if (state.project === prevProject) return;
      prevProject = state.project;
      if (isSyncingFromCanvasRef.current) return;
      const json = serializeProjectToScreenshotJson(state.project);
      const activePhase =
        state.project.phases.find(
          (p) => p.id === sessionStore.getState().activePhaseId,
        ) ?? state.project.phases[0];
      const finalJson = activePhase?.boundaryBox
        ? JSON.stringify({
            ...JSON.parse(json),
            boundaryBox: activePhase.boundaryBox,
          })
        : json;
      onAutoSave?.(finalJson);
    });
  }, [documentStore, sessionStore, onAutoSave]);

  const handleCanvasAutoSave = useCallback(
    (annotationsJson: string) => {
      isSyncingFromCanvasRef.current = true;
      try {
        const bundle = translateScreenshotToProject({
          screenshotId: screenshot.id,
          backgroundImageUrl: screenshot.imageDataUrl,
          canvasAnnotationsJson: annotationsJson,
        });
        documentStore.getState().loadProject(bundle.project);
      } finally {
        isSyncingFromCanvasRef.current = false;
      }
      onAutoSave?.(annotationsJson);
    },
    [screenshot.id, screenshot.imageDataUrl, documentStore, onAutoSave],
  );

  const initialAnnotations = useMemo(
    () => serializeProjectToScreenshotJson(documentStore.getState().project),
    [documentStore],
  );

  const config = useMemo<CanvasConfig>(
    () => ({
      mode: 'screenshot-edit',
      backgroundImageUrl: screenshot.imageDataUrl,
      initialAnnotations,
      markerMode: '3d-only',
      defaultBoundaryBox: DEFAULT_BOUNDARY_BOX_FULL,
    }),
    [screenshot.imageDataUrl, initialAnnotations],
  );

  return (
    <CanvasStoreProvider config={config} onAutoSave={handleCanvasAutoSave}>
      <ForwardedInner
        ref={ref}
        className={className}
        imageAspect={imageAspect}
      />
    </CanvasStoreProvider>
  );
}

const ForwardedBridge = forwardRef<
  QuickAnnotationCanvasHandle,
  QuickAnnotationCanvasProps
>(QuickAnnotationCanvasBridge);

export const QuickAnnotationCanvas = forwardRef<
  QuickAnnotationCanvasHandle,
  QuickAnnotationCanvasProps
>(function QuickAnnotationCanvas(
  props: QuickAnnotationCanvasProps,
  ref,
): ReactElement {
  const { screenshot } = props;
  const initialBundle = useMemo(
    () =>
      translateScreenshotToProject({
        screenshotId: screenshot.id,
        backgroundImageUrl: screenshot.imageDataUrl,
        canvasAnnotationsJson: screenshot.canvasAnnotations,
      }),
    [screenshot.id, screenshot.imageDataUrl, screenshot.canvasAnnotations],
  );

  return (
    <TacticalStoreProvider
      initialProject={initialBundle.project}
      initialSession={{
        activePhaseId: initialBundle.activePhaseId,
        activeSlideId: initialBundle.activeSlideId,
      }}
    >
      <ForwardedBridge ref={ref} {...props} />
    </TacticalStoreProvider>
  );
});
