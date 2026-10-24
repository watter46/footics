/**
 * tactical-canvas-store-adapter.ts
 *
 * useTacticalUnifiedStore を唯一の真実源（Single Source of Truth）として
 * Level 2 CanvasStageContainer (useCanvasStore) に供給するためのアダプター。
 */

import type { StoreApi } from 'zustand';
import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
} from '../core/store/canvas-store-pitch';
import type {
  AnnotationsData,
  CanvasActions,
  CanvasClipboard,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
  SelectedObject,
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

const DEFAULT_CAPABILITIES: CanvasStore['capabilities'] = {
  hasBall: true,
  hasPitchLock: true,
  hasBench: true,
  paddingRatio: 0,
};
const DEFAULT_HISTORY: CanvasStore['history'] = { past: [], future: [] };
const DEFAULT_BALL: CanvasStore['ball'] = { x: 50, y: 50, visible: true };
const EMPTY_ARR: [] = [];

export function createTacticalCanvasStoreAdapter(
  unifiedStore: StoreApi<TacticalUnifiedState>,
): CanvasStoreApi {
  const temporal = (unifiedStore as unknown as TemporalStoreApi).temporal;
  const s = () => unifiedStore.getState();

  const local = {
    drawingPreview: null as DrawingPreviewState | null,
    isDragging: false,
    isHudOpen: true,
    color: '#ffffff',
    strokeWidth: 2,
    fontSize: 14,
    customColor: '#ffffff',
    markerMode: 'all' as '2d-only' | '3d-only' | 'all',
  };
  let clipboard: CanvasClipboard | null = null;

  const listeners = new Set<
    (state: CanvasStore, prevState: CanvasStore) => void
  >();

  const clipboardHelpers = createAdapterClipboardHelpers(
    s,
    () => clipboard,
    (cb) => {
      clipboard = cb;
      updateAndNotify();
    },
  );

  function getActiveSlide(state: TacticalUnifiedState) {
    return state.project.slides.find((sl) => sl.id === state.activeSlideId);
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

  // Annotations キャッシュ
  let prevArrows: ArrowAnnotation[] | undefined;
  let prevZones: ZoneAnnotation[] | undefined;
  let prevTexts: TextAnnotation[] | undefined;
  let prevMarkers: Player[] | undefined;
  let cachedAnnotations: AnnotationsData = {
    arrows: EMPTY_ARR,
    zones: EMPTY_ARR,
    texts: EMPTY_ARR,
    markers: EMPTY_ARR,
  };

  function getAnnotations(slide: Slide | undefined): AnnotationsData {
    const a = slide?.arrows ?? EMPTY_ARR;
    const z = slide?.zones ?? EMPTY_ARR;
    const t = slide?.texts ?? EMPTY_ARR;
    const m = slide?.players ?? EMPTY_ARR;
    if (
      a === prevArrows &&
      z === prevZones &&
      t === prevTexts &&
      m === prevMarkers
    ) {
      return cachedAnnotations;
    }
    prevArrows = a;
    prevZones = z;
    prevTexts = t;
    prevMarkers = m;
    cachedAnnotations = { arrows: a, zones: z, texts: t, markers: m };
    return cachedAnnotations;
  }

  // selectedIds キャッシュ
  let prevSelectedObjects: readonly SelectedObject[] | undefined;
  let cachedSelectedIds: string[] = [];

  function getSelectedIds(objects: readonly SelectedObject[]): string[] {
    if (objects === prevSelectedObjects) return cachedSelectedIds;
    const ids = objects.map((o) => o.id);
    if (
      cachedSelectedIds.length === ids.length &&
      cachedSelectedIds.every((id, i) => id === ids[i])
    ) {
      prevSelectedObjects = objects;
      return cachedSelectedIds;
    }
    prevSelectedObjects = objects;
    cachedSelectedIds = ids;
    return cachedSelectedIds;
  }

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
    copySelectedObjects: clipboardHelpers.copySelectedObjects,
    pasteObjects: clipboardHelpers.pasteObjects,
    duplicateSelectedObjects: clipboardHelpers.duplicateSelectedObjects,
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
      annotations: getAnnotations(active),
      clipboard,
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
      let changed = false;
      if (
        next.drawingPreview !== undefined &&
        next.drawingPreview !== local.drawingPreview
      ) {
        local.drawingPreview = next.drawingPreview ?? null;
        changed = true;
      }
      if (
        next.isDragging !== undefined &&
        next.isDragging !== local.isDragging
      ) {
        local.isDragging = next.isDragging;
        changed = true;
      }
      if (next.isHudOpen !== undefined && next.isHudOpen !== local.isHudOpen) {
        local.isHudOpen = next.isHudOpen;
        changed = true;
      }
      if (
        next.markerMode !== undefined &&
        next.markerMode !== local.markerMode
      ) {
        local.markerMode = next.markerMode;
        changed = true;
      }
      if (
        next.customColor !== undefined &&
        next.customColor !== local.customColor
      ) {
        local.customColor = next.customColor;
        changed = true;
      }
      if (changed) updateAndNotify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
