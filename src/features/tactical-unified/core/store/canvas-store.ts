import { createStore } from 'zustand/vanilla';
import {
  DEFAULT_BOUNDARY_BOX_FULL,
  type DrawingTool,
} from '@/lib/types/tactical-unified';
import type {
  AnnotationsData,
  CanvasCapabilities,
  CanvasConfig,
  CanvasHistorySnapshot,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
  SelectedObject,
} from '../types';
import { createAnnotationActions } from './canvas-store-actions';
import { createClipboardActions } from './canvas-store-clipboard';
import { createHistoryActions } from './canvas-store-history';
import {
  createPitchActions,
  DEFAULT_BOUNDARY_BOX,
  DEFAULT_PITCH_TRANSFORM,
  EMPTY_ANNOTATIONS,
} from './canvas-store-pitch';

function parseInitialAnnotations(json?: string): AnnotationsData {
  if (!json) return EMPTY_ANNOTATIONS;
  try {
    const p = JSON.parse(json);
    const arr = (v: unknown) => (Array.isArray(v) ? v : []);
    return {
      arrows: arr(p.arrows),
      zones: arr(p.zones),
      texts: arr(p.texts),
      markers: arr(p.markers),
    };
  } catch {
    return EMPTY_ANNOTATIONS;
  }
}

export function createCanvasStore(config: CanvasConfig): CanvasStoreApi {
  const initialAnnotations = parseInitialAnnotations(config.initialAnnotations);
  const isPitchFitMode =
    config.mode === 'full-tactical' || config.mode === 'tactical-board';
  const capabilities: CanvasCapabilities = {
    hasBall: config.capabilities?.hasBall ?? isPitchFitMode,
    hasPitchLock: config.capabilities?.hasPitchLock ?? isPitchFitMode,
    hasBench: config.capabilities?.hasBench ?? isPitchFitMode,
    paddingRatio:
      config.capabilities?.paddingRatio ??
      (config.mode === 'full-tactical' ? 0.06 : 0),
  };
  const boundaryBox =
    config.defaultBoundaryBox ??
    (isPitchFitMode
      ? { ...DEFAULT_BOUNDARY_BOX, visible: false, fitTarget: 'pitch' as const }
      : {
          ...DEFAULT_BOUNDARY_BOX_FULL,
          visible: false,
          fitTarget: 'canvas' as const,
        });
  const markerMode =
    config.markerMode ??
    (config.mode === 'screenshot-edit' ? '3d-only' : 'all');
  const aspectRatio = config.aspectRatio ?? '4:5';

  return createStore<CanvasStore>()((set, get) => {
    const pushHistory = () => {
      const { annotations, boundaryBox, pitchTransform, history } = get();
      const snapshot: CanvasHistorySnapshot = {
        annotations: JSON.parse(JSON.stringify(annotations)),
        boundaryBox: { ...boundaryBox },
        pitchTransform: { ...pitchTransform },
      };
      set({
        history: {
          past: [...history.past, snapshot],
          future: [],
        },
      });
    };

    const annotationActions = createAnnotationActions(set, get, pushHistory);
    const pitchActions = createPitchActions(set, pushHistory);
    const historyActions = createHistoryActions(set, get);
    const clipboardActions = createClipboardActions(set, get, pushHistory);

    const resolveObject = (target: string | SelectedObject): SelectedObject => {
      if (typeof target !== 'string') return target;
      const { annotations } = get();
      if (annotations.arrows.some((a) => a.id === target))
        return { id: target, kind: 'arrow' };
      if (annotations.zones.some((z) => z.id === target))
        return { id: target, kind: 'zone' };
      if (annotations.texts.some((t) => t.id === target))
        return { id: target, kind: 'text' };
      for (const m of annotations.markers) {
        if (m.connectLines?.some((cl) => cl.id === target)) {
          return { id: target, kind: 'connect-line', parentPlayerId: m.id };
        }
      }
      return { id: target, kind: 'player' };
    };

    return {
      config,
      capabilities,
      ball: capabilities.hasBall ? { x: 50, y: 50, visible: true } : null,
      teamVisibility: 'both',
      activeTool: 'select',
      continuousDrawing: false,
      selectedObjects: [],
      selectedIds: [],
      pitchTransform: config.defaultPitchTransform
        ? { ...config.defaultPitchTransform }
        : { ...DEFAULT_PITCH_TRANSFORM },
      boundaryBox,
      aspectRatio,
      annotations: initialAnnotations,
      clipboard: null,
      color: '#ffffff',
      customColor: '#ffffff',
      strokeWidth: 3,
      fontSize: 16,
      markerMode,
      backgroundImageUrl: config.backgroundImageUrl,
      drawingPreview: null,
      isDragging: false,
      isHudOpen: false,
      connectingPlayerId: null,
      history: { past: [], future: [] },

      setActiveTool: (tool: DrawingTool) =>
        set({ activeTool: tool, connectingPlayerId: null }),
      setContinuousDrawing: (continuous: boolean) =>
        set({ continuousDrawing: continuous }),
      toggleContinuousDrawing: () =>
        set((s) => ({ continuousDrawing: !s.continuousDrawing })),
      setColor: (color: string) => set({ color }),
      setCustomColor: (color: string) => set({ customColor: color }),
      setStrokeWidth: (width: number) => set({ strokeWidth: width }),
      setFontSize: (size: number) => set({ fontSize: size }),
      setMarkerMode: (mode) => set({ markerMode: mode }),
      setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
      setDrawingPreview: (preview: DrawingPreviewState | null) =>
        set({ drawingPreview: preview }),
      setIsDragging: (isDragging: boolean) => set({ isDragging }),
      setIsHudOpen: (isHudOpen: boolean) => set({ isHudOpen }),
      setConnectingPlayerId: (id: string | null) =>
        set({ connectingPlayerId: id }),

      setSelectedIds: (ids: string[]) => {
        const objs = ids.map(resolveObject);
        set({
          selectedIds: ids,
          selectedObjects: objs,
          isHudOpen: ids.length > 0,
        });
      },
      setSelectedObjects: (objects: SelectedObject[]) =>
        set({
          selectedObjects: objects,
          selectedIds: objects.map((o) => o.id),
          isHudOpen: objects.length > 0,
        }),
      selectObject: (target, isShiftOrMulti = false) => {
        if (!target) {
          set({ selectedObjects: [], selectedIds: [], isHudOpen: false });
          return;
        }
        const obj = resolveObject(target);
        set((s) => {
          const exists = s.selectedObjects.some((o) => o.id === obj.id);
          const nextObjs = isShiftOrMulti
            ? exists
              ? s.selectedObjects.filter((o) => o.id !== obj.id)
              : [...s.selectedObjects, obj]
            : [obj];
          return {
            selectedObjects: nextObjs,
            selectedIds: nextObjs.map((o) => o.id),
            isHudOpen: nextObjs.length > 0,
          };
        });
      },
      selectObjects: (objects, multi = false) => {
        set((s) => {
          const nextObjs = multi
            ? [...s.selectedObjects, ...objects]
            : [...objects];
          return {
            selectedObjects: nextObjs,
            selectedIds: nextObjs.map((o) => o.id),
            isHudOpen: true,
          };
        });
      },
      clearSelection: () =>
        set({
          selectedObjects: [],
          selectedIds: [],
          isHudOpen: false,
          connectingPlayerId: null,
        }),

      ...annotationActions,
      ...pitchActions,
      ...historyActions,
      ...clipboardActions,
    };
  });
}
