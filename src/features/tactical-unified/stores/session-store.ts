import { createStore, type StoreApi } from 'zustand';
import type {
  EphemeralDragDelta,
  EphemeralSessionState,
} from '@/lib/tactical/compiler/scene-graph-dto';

export interface SessionStoreState {
  readonly activePhaseId: string;
  readonly activeSlideId: string;
  readonly activeTool: string;
  readonly selectedIds: readonly string[];
  readonly activeDragDelta: EphemeralDragDelta | null;
  readonly drawingPreview: EphemeralSessionState['drawingPreview'] | null;

  readonly setActivePhaseId: (phaseId: string) => void;
  readonly setActiveSlideId: (slideId: string) => void;
  readonly setActiveTool: (tool: string) => void;
  readonly setSelectedIds: (ids: readonly string[]) => void;
  readonly toggleSelectId: (id: string, multi?: boolean) => void;
  readonly clearSelection: () => void;
  readonly setActiveDragDelta: (delta: EphemeralDragDelta | null) => void;
  readonly setDrawingPreview: (
    preview: EphemeralSessionState['drawingPreview'] | null,
  ) => void;
  readonly resetSession: (init?: Partial<SessionStoreState>) => void;
}

export type SessionStore = StoreApi<SessionStoreState>;

export interface CreateSessionStoreOptions {
  activePhaseId?: string;
  activeSlideId?: string;
  activeTool?: string;
  selectedIds?: readonly string[];
  activeDragDelta?: EphemeralDragDelta | null;
  drawingPreview?: EphemeralSessionState['drawingPreview'] | null;
}

export function createSessionStore(
  initial?: CreateSessionStoreOptions,
): SessionStore {
  return createStore<SessionStoreState>((set) => ({
    activePhaseId: initial?.activePhaseId ?? '',
    activeSlideId: initial?.activeSlideId ?? '',
    activeTool: initial?.activeTool ?? 'select',
    selectedIds: initial?.selectedIds ?? [],
    activeDragDelta: initial?.activeDragDelta ?? null,
    drawingPreview: initial?.drawingPreview ?? null,

    setActivePhaseId: (phaseId: string) => set({ activePhaseId: phaseId }),

    setActiveSlideId: (slideId: string) => set({ activeSlideId: slideId }),

    setActiveTool: (tool: string) => set({ activeTool: tool }),

    setSelectedIds: (ids: readonly string[]) => set({ selectedIds: ids }),

    toggleSelectId: (id: string, multi = false) => {
      set((state) => {
        if (!multi) {
          const isAlreadySingle =
            state.selectedIds.length === 1 && state.selectedIds[0] === id;
          return { selectedIds: isAlreadySingle ? [] : [id] };
        }
        const exists = state.selectedIds.includes(id);
        const nextIds = exists
          ? state.selectedIds.filter((item) => item !== id)
          : [...state.selectedIds, id];
        return { selectedIds: nextIds };
      });
    },

    clearSelection: () => set({ selectedIds: [] }),

    setActiveDragDelta: (delta: EphemeralDragDelta | null) =>
      set({ activeDragDelta: delta }),

    setDrawingPreview: (
      preview: EphemeralSessionState['drawingPreview'] | null,
    ) => set({ drawingPreview: preview }),

    resetSession: (init?: Partial<SessionStoreState>) =>
      set((state) => ({
        ...state,
        activeDragDelta: null,
        drawingPreview: null,
        ...init,
      })),
  }));
}
