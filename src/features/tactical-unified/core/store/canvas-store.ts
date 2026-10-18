import { createStore } from 'zustand/vanilla';
import type { BoundaryBox, DrawingTool } from '@/lib/types/tactical-unified';
import type {
  AnnotationsData,
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
  DEFAULT_PITCH_TRANSFORM,
} from './canvas-store-pitch';

const DEFAULT_BOUNDARY_BOX: BoundaryBox = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  enabled: true,
  visible: false,
  fitTarget: 'canvas',
};

const EMPTY_ANNOTATIONS: AnnotationsData = {
  arrows: [],
  zones: [],
  texts: [],
  markers: [],
};

function parseInitialAnnotations(json?: string): AnnotationsData {
  if (!json) return EMPTY_ANNOTATIONS;
  try {
    const parsed = JSON.parse(json);
    return {
      arrows: Array.isArray(parsed.arrows) ? parsed.arrows : [],
      zones: Array.isArray(parsed.zones) ? parsed.zones : [],
      texts: Array.isArray(parsed.texts) ? parsed.texts : [],
      markers: Array.isArray(parsed.markers) ? parsed.markers : [],
    };
  } catch (err) {
    console.warn('[canvas-store] Failed to parse initialAnnotations:', err);
    return EMPTY_ANNOTATIONS;
  }
}

export function createCanvasStore(config: CanvasConfig): CanvasStoreApi {
  const initialAnnotations = parseInitialAnnotations(config.initialAnnotations);
  const boundaryBox = config.defaultBoundaryBox ?? { ...DEFAULT_BOUNDARY_BOX };
  const markerMode =
    config.markerMode ??
    (config.mode === 'screenshot-edit' ? '3d-only' : 'all');
  const aspectRatio = config.aspectRatio ?? '16:9';

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
      activeTool: 'select',
      continuousDrawing: false,
      selectedObjects: [],
      selectedIds: [],
      pitchTransform: { ...DEFAULT_PITCH_TRANSFORM },
      boundaryBox,
      aspectRatio,
      annotations: initialAnnotations,
      clipboard: null,
      color: '#ffffff',
      strokeWidth: 3,
      fontSize: 16,
      markerMode,
      backgroundImageUrl: config.backgroundImageUrl,
      drawingPreview: null,
      isDragging: false,
      isHudOpen: false,
      history: { past: [], future: [] },

      setActiveTool: (tool: DrawingTool) => set({ activeTool: tool }),
      setContinuousDrawing: (continuous: boolean) =>
        set({ continuousDrawing: continuous }),
      toggleContinuousDrawing: () =>
        set((s) => ({ continuousDrawing: !s.continuousDrawing })),
      setColor: (color: string) => set({ color }),
      setStrokeWidth: (width: number) => set({ strokeWidth: width }),
      setFontSize: (size: number) => set({ fontSize: size }),
      setMarkerMode: (mode) => set({ markerMode: mode }),
      setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
      setDrawingPreview: (preview: DrawingPreviewState | null) =>
        set({ drawingPreview: preview }),
      setIsDragging: (isDragging: boolean) => set({ isDragging }),
      setIsHudOpen: (isHudOpen: boolean) => set({ isHudOpen }),

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
        set({ selectedObjects: [], selectedIds: [], isHudOpen: false }),

      ...annotationActions,
      ...pitchActions,
      ...historyActions,
      ...clipboardActions,
    };
  });
}
