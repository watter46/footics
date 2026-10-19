'use client';

/**
 * drawing-toolbar.tsx
 * Web-layer wrapper around CoreDrawingToolbar.
 * Bridges CanvasStoreContext with useTacticalUnifiedStore if not already wrapped.
 */

import { useContext, useEffect, useMemo } from 'react';
import {
  CanvasStoreContext,
  CanvasStoreProvider,
  CoreDrawingToolbar,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';

export interface DrawingToolbarProps {
  markerMode?: '2d-only' | '3d-only' | 'all';
  className?: string;
}

function DrawingToolbarWithAdapter({
  markerMode = '2d-only',
  className = '',
}: DrawingToolbarProps) {
  const activeTool = useTacticalUnifiedStore((s) => s.activeTool);
  const setActiveTool = useTacticalUnifiedStore((s) => s.setActiveTool);
  const continuousDrawing = useTacticalUnifiedStore((s) => s.continuousDrawing);
  const toggleContinuousDrawing = useTacticalUnifiedStore(
    (s) => s.toggleContinuousDrawing,
  );
  const resetSlideObjects = useTacticalUnifiedStore((s) => s.resetSlideObjects);
  const activeSlideId = useTacticalUnifiedStore((s) => s.activeSlideId);
  const togglePitchLock = useTacticalUnifiedStore((s) => s.togglePitchLock);
  const isPitchLocked = useTacticalUnifiedStore(
    (s) =>
      s.project.slides.find((sl) => sl.id === s.activeSlideId)?.pitchTransform
        ?.isLocked ?? false,
  );

  const storeApi = useMemo(() => {
    return createCanvasStore({
      mode: 'tactical-board',
      markerMode,
    });
  }, [markerMode]);

  useEffect(() => {
    storeApi.setState({
      activeTool,
      continuousDrawing,
      pitchTransform: {
        ...storeApi.getState().pitchTransform,
        isLocked: isPitchLocked,
      },
    });
  }, [storeApi, activeTool, continuousDrawing, isPitchLocked]);

  useEffect(() => {
    return storeApi.subscribe((state, prevState) => {
      if (state.activeTool !== prevState.activeTool) {
        setActiveTool(state.activeTool);
      }
      if (state.continuousDrawing !== prevState.continuousDrawing) {
        toggleContinuousDrawing();
      }
      if (state.pitchTransform.isLocked !== prevState.pitchTransform.isLocked) {
        togglePitchLock(activeSlideId);
      }
      if (
        state.annotations.arrows.length === 0 &&
        state.annotations.zones.length === 0 &&
        state.annotations.texts.length === 0 &&
        state.annotations.markers.length === 0 &&
        (prevState.annotations.arrows.length > 0 ||
          prevState.annotations.zones.length > 0 ||
          prevState.annotations.texts.length > 0 ||
          prevState.annotations.markers.length > 0)
      ) {
        resetSlideObjects();
      }
    });
  }, [
    storeApi,
    setActiveTool,
    toggleContinuousDrawing,
    togglePitchLock,
    resetSlideObjects,
    activeSlideId,
  ]);

  return (
    <CanvasStoreProvider store={storeApi}>
      <CoreDrawingToolbar markerMode={markerMode} className={className} />
    </CanvasStoreProvider>
  );
}

export function DrawingToolbar({
  markerMode = '2d-only',
  className = '',
}: DrawingToolbarProps = {}) {
  const storeContext = useContext(CanvasStoreContext);

  if (storeContext) {
    return <CoreDrawingToolbar markerMode={markerMode} className={className} />;
  }

  return (
    <DrawingToolbarWithAdapter markerMode={markerMode} className={className} />
  );
}
