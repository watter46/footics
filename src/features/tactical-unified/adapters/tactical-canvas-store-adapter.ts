/**
 * tactical-canvas-store-adapter.ts
 *
 * useTacticalUnifiedStore を唯一の真実源（Single Source of Truth）として
 * Level 2 CanvasStageContainer (useCanvasStore) に供給するためのアダプター。
 */

import type { StoreApi } from 'zustand';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
} from '../core/store/canvas-store-pitch';
import type {
  AnnotationsData,
  CanvasClipboard,
  CanvasHistorySnapshot,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
} from '../core/types';
import {
  selectCanRedo,
  selectCanUndo,
} from '../stores/tactical-unified-selectors';
import {
  selectPreviousSlide,
  type TacticalUnifiedState,
} from '../stores/tactical-unified-store';
import { createAdapterClipboardHelpers } from './adapter-clipboard-helpers';
import {
  executeRemoveSelected,
  resolveSelectedObjectFromId,
} from './adapter-selection-helpers';

interface TemporalStoreApi {
  temporal?: StoreApi<{
    pastStates: unknown[];
    futureStates: unknown[];
    undo: () => void;
    redo: () => void;
  }>;
}

export function createTacticalCanvasStoreAdapter(
  unifiedStore: StoreApi<TacticalUnifiedState>,
): CanvasStoreApi {
  let drawingPreview: DrawingPreviewState | null = null;
  let isDragging = false;
  let isHudOpen = true;
  let color = '#ffffff';
  let strokeWidth = 2;
  let fontSize = 14;
  let customColor = '#ffffff';
  let clipboard: CanvasClipboard | null = null;
  let markerMode: '2d-only' | '3d-only' | 'all' = 'all';

  const listeners = new Set<
    (state: CanvasStore, prevState: CanvasStore) => void
  >();

  const clipboardHelpers = createAdapterClipboardHelpers(
    () => unifiedStore.getState(),
    () => clipboard,
    (cb) => {
      clipboard = cb;
      updateAndNotify();
    },
  );

  function getActiveSlide(state: TacticalUnifiedState) {
    return state.project.slides.find((s) => s.id === state.activeSlideId);
  }

  function buildState(): CanvasStore {
    const s = unifiedStore.getState();
    const activeSlide = getActiveSlide(s);
    const temporal = (unifiedStore as unknown as TemporalStoreApi).temporal;
    const aspectRatio = activeSlide?.aspectRatio ?? s.project.aspectRatio;

    const annotations: AnnotationsData = {
      arrows: activeSlide?.arrows ?? [],
      zones: activeSlide?.zones ?? [],
      texts: activeSlide?.texts ?? [],
      markers: activeSlide?.players ?? [],
    };

    return {
      config: {
        mode: 'tactical-board',
        markerMode,
        aspectRatio,
        backgroundImageUrl: activeSlide?.backgroundImageUrl,
        defaultBoundaryBox: activeSlide?.boundaryBox,
        defaultPitchTransform: activeSlide?.pitchTransform,
      },
      capabilities: {
        hasBall: true,
        hasPitchLock: true,
        hasBench: true,
        paddingRatio: 0,
      },
      ball: activeSlide?.ball ?? { x: 50, y: 50, visible: true },
      teamVisibility: s.teamVisibility,
      activeTool: s.activeTool,
      continuousDrawing: s.continuousDrawing,
      selectedObjects: s.selectedObjects,
      selectedIds: s.selectedObjects.map((o) => o.id),
      pitchTransform: activeSlide?.pitchTransform ?? DEFAULT_PITCH_TRANSFORM,
      boundaryBox: activeSlide?.boundaryBox ?? DEFAULT_BOUNDARY_BOX,
      aspectRatio,
      annotations,
      clipboard,
      color,
      strokeWidth,
      fontSize,
      markerMode,
      backgroundImageUrl: activeSlide?.backgroundImageUrl,
      drawingPreview,
      isDragging,
      isHudOpen,
      customColor,
      connectingPlayerId: s.connectingPlayerId,
      prevSlide: selectPreviousSlide(s),
      activeSlideId: s.activeSlideId,
      history: {
        past: [] as CanvasHistorySnapshot[],
        future: [] as CanvasHistorySnapshot[],
      },

      setActiveTool: (tool) => s.setActiveTool(tool),
      setContinuousDrawing: (continuous) => s.setContinuousDrawing(continuous),
      toggleContinuousDrawing: () => s.toggleContinuousDrawing(),
      setColor: (c) => {
        color = c;
        updateAndNotify();
      },
      setCustomColor: (c) => {
        customColor = c;
        updateAndNotify();
      },
      setStrokeWidth: (w) => {
        strokeWidth = w;
        updateAndNotify();
      },
      setFontSize: (size) => {
        fontSize = size;
        updateAndNotify();
      },
      setMarkerMode: (mode) => {
        markerMode = mode;
        updateAndNotify();
      },
      setBackgroundImageUrl: (url) => {
        s.updateSlide(s.activeSlideId, { backgroundImageUrl: url });
      },
      setDrawingPreview: (preview) => {
        drawingPreview = preview;
        updateAndNotify();
      },
      setIsDragging: (dragging) => {
        isDragging = dragging;
        updateAndNotify();
      },
      setIsHudOpen: (open) => {
        isHudOpen = open;
        updateAndNotify();
      },
      setConnectingPlayerId: (id) => s.setConnectingPlayerId(id),

      setSelectedIds: (ids) => {
        const objs = ids.map((id) => resolveSelectedObjectFromId(s, id));
        s.selectObjects(objs);
      },
      setSelectedObjects: (objects) => s.selectObjects(objects),
      selectObject: (target, isShiftOrMulti = false) => {
        if (!target) {
          s.clearSelection();
          return;
        }
        isHudOpen = true;
        const obj =
          typeof target === 'string'
            ? resolveSelectedObjectFromId(s, target)
            : target;
        s.selectObject(obj, isShiftOrMulti);
      },
      selectObjects: (objects, multi = false) => {
        if (objects.length === 1) isHudOpen = true;
        s.selectObjects(objects, multi);
      },
      clearSelection: () => s.clearSelection(),

      setBoundaryBox: (box) => s.setBoundaryBox(s.activeSlideId, box),
      setPitchTransform: (patch) => {
        if (typeof patch === 'function') {
          const current =
            activeSlide?.pitchTransform ?? DEFAULT_PITCH_TRANSFORM;
          s.updatePitchTransform(s.activeSlideId, patch(current));
        } else {
          s.updatePitchTransform(s.activeSlideId, patch);
        }
      },
      resetPitchTransform: () => s.centerPitchAndBoundary(s.activeSlideId),
      setPitchLocked: (locked) => {
        const currentLocked = activeSlide?.pitchTransform?.isLocked ?? false;
        if (currentLocked !== locked) {
          s.togglePitchLock(s.activeSlideId);
        }
      },
      setAspectRatio: (ar) => s.setAspectRatio(ar),

      addArrow: (arrow) => s.addArrow(s.activeSlideId, arrow),
      updateArrow: (id, patch) => s.updateArrow(s.activeSlideId, id, patch),
      removeArrow: (id) => s.removeArrow(s.activeSlideId, id),
      addZone: (zone) => s.addZone(s.activeSlideId, zone),
      updateZone: (id, patch) => s.updateZone(s.activeSlideId, id, patch),
      removeZone: (id) => s.removeZone(s.activeSlideId, id),
      addText: (text) => s.addText(s.activeSlideId, text),
      updateText: (id, patch) => s.updateText(s.activeSlideId, id, patch),
      removeText: (id) => s.removeText(s.activeSlideId, id),
      addMarker: (marker) => s.addPlayer(marker),
      updateMarker: (id, patch) => s.updatePlayer(s.activeSlideId, id, patch),
      removeMarker: (id) => s.removePlayer(s.activeSlideId, id),
      moveMarkerToBench: (id) => s.movePlayerToBench(s.activeSlideId, id),
      updatePlayerTrajectory: (slideId, markerId, trajectory) =>
        s.updatePlayerTrajectory(slideId, markerId, trajectory),
      removeSelected: () => executeRemoveSelected(s),
      setAnnotations: (data) => {
        s.updateSlide(s.activeSlideId, {
          arrows: data.arrows,
          zones: data.zones,
          texts: data.texts,
          players: data.markers,
        });
      },
      eraseAtPoint: (point, radius) =>
        s.eraseAtPoint(s.activeSlideId, point, radius),

      copySelectedObjects: clipboardHelpers.copySelectedObjects,
      pasteObjects: clipboardHelpers.pasteObjects,
      duplicateSelectedObjects: clipboardHelpers.duplicateSelectedObjects,

      undo: () => {
        if (temporal) temporal.getState().undo();
        else s.undo();
      },
      redo: () => {
        if (temporal) temporal.getState().redo();
        else s.redo();
      },
      canUndo: () => {
        if (temporal) return temporal.getState().pastStates.length > 0;
        return selectCanUndo(s);
      },
      canRedo: () => {
        if (temporal) return temporal.getState().futureStates.length > 0;
        return selectCanRedo(s);
      },
    };
  }

  // キャッシュされた最新スナップショット（useSyncExternalStoreの無限ループ防止に必須）
  let currentState: CanvasStore = buildState();
  const initialState: CanvasStore = currentState;

  function updateAndNotify() {
    const prevState = currentState;
    currentState = buildState();
    for (const listener of listeners) {
      listener(currentState, prevState);
    }
  }

  unifiedStore.subscribe(() => {
    updateAndNotify();
  });

  return {
    getState: () => currentState,
    getInitialState: () => initialState,
    setState: (partial) => {
      const next =
        typeof partial === 'function' ? partial(currentState) : partial;
      if (next.drawingPreview !== undefined)
        drawingPreview = next.drawingPreview ?? null;
      if (next.isDragging !== undefined) isDragging = next.isDragging;
      if (next.isHudOpen !== undefined) isHudOpen = next.isHudOpen;
      if (next.markerMode !== undefined) markerMode = next.markerMode;
      if (next.customColor !== undefined) customColor = next.customColor;
      updateAndNotify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
