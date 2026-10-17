import { createStore } from 'zustand/vanilla';
import type { BoundaryBox } from '@/lib/types/tactical-unified';
import type {
  AnnotationsData,
  CanvasConfig,
  CanvasHistorySnapshot,
  CanvasStore,
  CanvasStoreApi,
  DrawingPreviewState,
} from '../types';
import { createAnnotationActions } from './canvas-store-actions';
import { createHistoryActions } from './canvas-store-history';

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

  return createStore<CanvasStore>()((set, get) => {
    const pushHistory = () => {
      const { annotations, boundaryBox, history } = get();
      const snapshot: CanvasHistorySnapshot = {
        annotations: JSON.parse(JSON.stringify(annotations)),
        boundaryBox: { ...boundaryBox },
      };
      set({
        history: {
          past: [...history.past, snapshot],
          future: [],
        },
      });
    };

    const annotationActions = createAnnotationActions(set, get, pushHistory);
    const historyActions = createHistoryActions(set, get);

    return {
      config,
      activeTool: 'select',
      selectedIds: [],
      color: '#ef4444',
      strokeWidth: 3,
      fontSize: 16,
      markerMode,
      backgroundImageUrl: config.backgroundImageUrl,
      boundaryBox,
      annotations: initialAnnotations,
      drawingPreview: null,
      history: {
        past: [],
        future: [],
      },

      setActiveTool: (tool) => set({ activeTool: tool }),
      setColor: (color) => set({ color }),
      setStrokeWidth: (width) => set({ strokeWidth: width }),
      setFontSize: (size) => set({ fontSize: size }),
      setMarkerMode: (mode) => set({ markerMode: mode }),
      setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
      setSelectedIds: (ids) => set({ selectedIds: ids }),
      selectObject: (id, isShift = false) => {
        set((state) => ({
          selectedIds: isShift
            ? state.selectedIds.includes(id)
              ? state.selectedIds.filter((i) => i !== id)
              : [...state.selectedIds, id]
            : [id],
        }));
      },
      clearSelection: () => set({ selectedIds: [] }),
      setBoundaryBox: (box) => {
        pushHistory();
        set({ boundaryBox: box });
      },
      setDrawingPreview: (preview: DrawingPreviewState | null) =>
        set({ drawingPreview: preview }),

      ...annotationActions,
      ...historyActions,
    };
  });
}
