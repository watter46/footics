/**
 * tactical-canvas-store-adapter.ts
 *
 * useTacticalUnifiedStore を唯一の真実源（Single Source of Truth）として
 * Level 2 CanvasStageContainer (useCanvasStore) に供給するためのアダプター。
 */

import type { StoreApi } from 'zustand';
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchTransform,
  type Slide,
} from '@/lib/types/tactical-unified';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
} from '../core/store/canvas-store-pitch';
import type { CanvasActions, CanvasStore, CanvasStoreApi } from '../core/types';
import {
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
  selectActiveSlide,
  selectCanRedo,
  selectCanUndo,
} from '../stores/tactical-unified-selectors';
import {
  selectPreviousSlide,
  type TacticalUnifiedState,
} from '../stores/tactical-unified-store';
import {
  createAnnotationCache,
  createSelectedIdsCache,
  DEFAULT_BALL,
  DEFAULT_CAPABILITIES,
  DEFAULT_HISTORY,
} from './adapter-cache-helpers';
import {
  executeRemoveSelected,
  resolveSelectedObjectFromId,
} from './adapter-selection-helpers';

export {
  createAnnotationCache,
  createSelectedIdsCache,
  DEFAULT_BALL,
  DEFAULT_CAPABILITIES,
  DEFAULT_HISTORY,
} from './adapter-cache-helpers';

interface TemporalStoreApi {
  temporal?: StoreApi<{
    pastStates: unknown[];
    futureStates: unknown[];
    undo: () => void;
    redo: () => void;
  }>;
}

const UI_STATE_KEYS = [
  'drawingPreview',
  'isDragging',
  'isHudOpen',
  'color',
  'strokeWidth',
  'fontSize',
  'customColor',
  'markerMode',
] as const;

export function createTacticalCanvasStoreAdapter(
  unifiedStore: StoreApi<TacticalUnifiedState>,
): CanvasStoreApi {
  const temporal = (
    unifiedStore as StoreApi<TacticalUnifiedState> & TemporalStoreApi
  ).temporal;
  const s = () => unifiedStore.getState();

  const listeners = new Set<
    (state: CanvasStore, prevState: CanvasStore) => void
  >();

  function getActiveSlide(state: TacticalUnifiedState) {
    return selectActiveSlide(state);
  }

  const getAnnotations = createAnnotationCache();
  const getSelectedIds = createSelectedIdsCache();

  let editorViewport: PitchTransform = {
    ...DEFAULT_PITCH_TRANSFORM,
    isLocked: false,
  };

  const actions: CanvasActions = {
    setActiveTool: (tool) => s().setActiveTool(tool),
    setContinuousDrawing: (c) => s().setContinuousDrawing(c),
    toggleContinuousDrawing: () => s().toggleContinuousDrawing(),
    setColor: (c) => s().setColor(c),
    setCustomColor: (c) => s().setCustomColor(c),
    setStrokeWidth: (w) => s().setStrokeWidth(w),
    setFontSize: (sz) => s().setFontSize(sz),
    setMarkerMode: (m) => s().setMarkerMode(m),
    setBackgroundImageUrl: (url) =>
      s().updateSlide(s().activeSlideId, { backgroundImageUrl: url }),
    setDrawingPreview: (p) => s().setDrawingPreview(p),
    setIsDragging: (d) => s().setIsDragging(d),
    setIsHudOpen: (o) => s().setIsHudOpen(o),
    setConnectingPlayerId: (id) => s().setConnectingPlayerId(id),
    setSelectedIds: (ids) =>
      s().selectObjects(ids.map((id) => resolveSelectedObjectFromId(s(), id))),
    setSelectedObjects: (objs) => s().selectObjects(objs),
    selectObject: (target, isShift = false) => {
      if (!target) {
        s().clearSelection();
        return;
      }
      const obj =
        typeof target === 'string'
          ? resolveSelectedObjectFromId(s(), target)
          : target;
      s().selectObject(obj, isShift);
    },
    selectObjects: (objs, multi = false) => {
      s().selectObjects(objs, multi);
    },
    clearSelection: () => s().clearSelection(),
    setBoundaryBox: (box) => s().setBoundaryBox(s().activeSlideId, box),
    setPitchTransform: (patch) => {
      const next =
        typeof patch === 'function'
          ? patch(editorViewport)
          : { ...editorViewport, ...patch };
      editorViewport = { ...next, tilt: 0 };
      updateAndNotify();
    },
    resetPitchTransform: () => {
      editorViewport = {
        ...DEFAULT_PITCH_TRANSFORM,
        isLocked: editorViewport.isLocked,
      };
      updateAndNotify();
    },
    setPitchLocked: (locked) => {
      if (editorViewport.isLocked !== locked) {
        editorViewport = { ...editorViewport, isLocked: locked };
        updateAndNotify();
      }
    },
    setAspectRatio: (ar) => s().setAspectRatio(ar),
    addArrow: (a) => s().addArrow(s().activeSlideId, a),
    updateArrow: (id, p) => s().updateArrow(s().activeSlideId, id, p),
    removeArrow: (id) => s().removeArrow(s().activeSlideId, id),
    addZone: (z) => s().addZone(s().activeSlideId, z),
    updateZone: (id, p) => s().updateZone(s().activeSlideId, id, p),
    removeZone: (id) => s().removeZone(s().activeSlideId, id),
    addText: (t) => s().addText(s().activeSlideId, t),
    updateText: (id, p) => s().updateText(s().activeSlideId, id, p),
    removeText: (id) => s().removeText(s().activeSlideId, id),
    addMarker: (m) => s().addPlayer(m),
    updateMarker: (id, p) => s().updatePlayer(s().activeSlideId, id, p),
    updateMarkers: (updates) => s().updatePlayers(s().activeSlideId, updates),
    removeMarker: (id) => s().removePlayer(s().activeSlideId, id),
    moveMarkerToBench: (id, x, y) => {
      s().movePlayerToBench(s().activeSlideId, id, x, y);
      s().setRightPanelOpen(true);
      s().setRightPanelTab('squad');
    },
    updatePlayerTrajectory: (slideId, markerId, traj) =>
      s().updatePlayerTrajectory(slideId, markerId, traj),
    removeSelected: () => executeRemoveSelected(s()),
    setAnnotations: (data) =>
      s().updateSlide(s().activeSlideId, {
        arrows: data.arrows,
        zones: data.zones,
        texts: data.texts,
        players: data.markers,
      }),
    eraseAtPoint: (pt, r) => s().eraseAtPoint(s().activeSlideId, pt, r),
    copySelectedObjects: () => s().copySelectedObjects(),
    pasteObjects: () => s().pasteObjects(),
    duplicateSelectedObjects: () => s().duplicateSelectedObjects(),
    undo: () => (temporal ? temporal.getState().undo() : s().undo()),
    redo: () => (temporal ? temporal.getState().redo() : s().redo()),
    canUndo: () =>
      temporal ? temporal.getState().pastStates.length > 0 : selectCanUndo(s()),
    canRedo: () =>
      temporal
        ? temporal.getState().futureStates.length > 0
        : selectCanRedo(s()),
  };

  function buildState(): CanvasStore {
    const state = s();
    const active = getActiveSlide(state);
    return {
      config: {
        mode: 'tactical-board',
        markerMode: state.markerMode,
        aspectRatio: active?.aspectRatio ?? state.project.aspectRatio,
        backgroundImageUrl: active?.backgroundImageUrl,
        defaultBoundaryBox: active?.boundaryBox,
        defaultPitchTransform: active?.pitchTransform,
      },
      capabilities: DEFAULT_CAPABILITIES,
      ball: active?.ball ?? DEFAULT_BALL,
      teamVisibility: state.teamVisibility,
      activeTool: state.activeTool,
      continuousDrawing: state.continuousDrawing,
      selectedObjects: state.selectedObjects,
      selectedIds: getSelectedIds(state.selectedObjects),
      pitchTransform: editorViewport,
      boundaryBox: selectActivePhaseBoundaryBox(state),
      aspectRatio: selectActivePhaseAspectRatio(state),
      pitchAppearance:
        active?.pitchAppearance ??
        state.project.pitchAppearance ??
        DEFAULT_PITCH_APPEARANCE,
      annotations: getAnnotations(active),
      clipboard: state.clipboard
        ? {
            markers: state.clipboard.players,
            arrows: state.clipboard.arrows,
            zones: state.clipboard.zones,
            texts: state.clipboard.texts,
          }
        : null,
      drawingPreview: state.drawingPreview,
      isDragging: state.isDragging,
      isHudOpen: state.isHudOpen,
      color: state.color,
      strokeWidth: state.strokeWidth,
      fontSize: state.fontSize,
      customColor: state.customColor,
      markerMode: state.markerMode,
      connectingPlayerId: state.connectingPlayerId,
      prevSlide: selectPreviousSlide(state),
      activeSlideId: state.activeSlideId,
      history: DEFAULT_HISTORY,
      ...actions,
    };
  }

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
      const current = s();
      const patch: Partial<TacticalUnifiedState> = {};
      let hasDiff = false;

      for (const key of UI_STATE_KEYS) {
        if (key in next && next[key] !== undefined) {
          const val = next[key];
          if (val !== current[key]) {
            (patch as Record<string, unknown>)[key] = val;
            hasDiff = true;
          }
        }
      }

      if (hasDiff) {
        unifiedStore.setState(patch);
      }
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
