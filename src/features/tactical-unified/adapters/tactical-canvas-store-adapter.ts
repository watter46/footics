/**
 * tactical-canvas-store-adapter.ts
 *
 * useTacticalUnifiedStore を唯一の真実源（Single Source of Truth）として
 * Level 2 CanvasStageContainer (useCanvasStore) に供給するためのアダプター。
 */

import type { StoreApi } from 'zustand';
import {
  DEFAULT_PITCH_APPEARANCE,
  type Slide,
} from '@/lib/types/tactical-unified';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
} from '../core/store/canvas-store-pitch';
import type { CanvasActions, CanvasStore, CanvasStoreApi } from '../core/types';
import {
  selectActiveSlide,
  selectCanRedo,
  selectCanUndo,
} from '../stores/tactical-unified-selectors';
import {
  selectPreviousSlide,
  type TacticalUnifiedState,
} from '../stores/tactical-unified-store';
import {
  applyLocalStatePartial,
  createAnnotationCache,
  createInitialLocalState,
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
  applyLocalStatePartial,
  createAnnotationCache,
  createInitialLocalState,
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

export function createTacticalCanvasStoreAdapter(
  unifiedStore: StoreApi<TacticalUnifiedState>,
): CanvasStoreApi {
  const temporal = (
    unifiedStore as StoreApi<TacticalUnifiedState> & TemporalStoreApi
  ).temporal;
  const s = () => unifiedStore.getState();

  const local = createInitialLocalState();

  const listeners = new Set<
    (state: CanvasStore, prevState: CanvasStore) => void
  >();

  function getActiveSlide(state: TacticalUnifiedState) {
    return selectActiveSlide(state);
  }

  function setLocal<K extends keyof typeof local>(
    key: K,
    val: (typeof local)[K],
  ) {
    if (local[key] !== val) {
      local[key] = val;
      updateAndNotify();
    }
  }

  const getAnnotations = createAnnotationCache();
  const getSelectedIds = createSelectedIdsCache();

  const actions: CanvasActions = {
    setActiveTool: (tool) => s().setActiveTool(tool),
    setContinuousDrawing: (c) => s().setContinuousDrawing(c),
    toggleContinuousDrawing: () => s().toggleContinuousDrawing(),
    setColor: (c) => setLocal('color', c),
    setCustomColor: (c) => setLocal('customColor', c),
    setStrokeWidth: (w) => setLocal('strokeWidth', w),
    setFontSize: (sz) => setLocal('fontSize', sz),
    setMarkerMode: (m) => setLocal('markerMode', m),
    setBackgroundImageUrl: (url) =>
      s().updateSlide(s().activeSlideId, { backgroundImageUrl: url }),
    setDrawingPreview: (p) => setLocal('drawingPreview', p),
    setIsDragging: (d) => setLocal('isDragging', d),
    setIsHudOpen: (o) => setLocal('isHudOpen', o),
    setConnectingPlayerId: (id) => s().setConnectingPlayerId(id),
    setSelectedIds: (ids) =>
      s().selectObjects(ids.map((id) => resolveSelectedObjectFromId(s(), id))),
    setSelectedObjects: (objs) => s().selectObjects(objs),
    selectObject: (target, isShift = false) => {
      if (!target) {
        s().clearSelection();
        return;
      }
      local.isHudOpen = true;
      const obj =
        typeof target === 'string'
          ? resolveSelectedObjectFromId(s(), target)
          : target;
      s().selectObject(obj, isShift);
    },
    selectObjects: (objs, multi = false) => {
      if (objs.length === 1) local.isHudOpen = true;
      s().selectObjects(objs, multi);
    },
    clearSelection: () => s().clearSelection(),
    setBoundaryBox: (box) => s().setBoundaryBox(s().activeSlideId, box),
    setPitchTransform: (patch) => {
      const cur =
        getActiveSlide(s())?.pitchTransform ?? DEFAULT_PITCH_TRANSFORM;
      s().updatePitchTransform(
        s().activeSlideId,
        typeof patch === 'function' ? patch(cur) : patch,
      );
    },
    resetPitchTransform: () => s().centerPitchAndBoundary(s().activeSlideId),
    setPitchLocked: (locked) => {
      if ((getActiveSlide(s())?.pitchTransform?.isLocked ?? false) !== locked) {
        s().togglePitchLock(s().activeSlideId);
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
        markerMode: local.markerMode,
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
      pitchTransform: active?.pitchTransform ?? DEFAULT_PITCH_TRANSFORM,
      boundaryBox: active?.boundaryBox ?? DEFAULT_BOUNDARY_BOX,
      aspectRatio: active?.aspectRatio ?? state.project.aspectRatio,
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
      ...local,
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
      if (applyLocalStatePartial(local, next)) {
        updateAndNotify();
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
