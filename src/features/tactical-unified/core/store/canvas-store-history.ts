import type { StoreApi } from 'zustand/vanilla';
import type {
  CanvasActions,
  CanvasHistorySnapshot,
  CanvasStore,
} from '../types';

type SetState = StoreApi<CanvasStore>['setState'];
type GetState = StoreApi<CanvasStore>['getState'];

export function createHistoryActions(
  set: SetState,
  get: GetState,
): Pick<CanvasActions, 'undo' | 'redo' | 'canUndo' | 'canRedo'> {
  return {
    undo: () => {
      const { history, annotations, boundaryBox, pitchTransform } = get();
      if (history.past.length === 0) return;
      const previous = history.past[history.past.length - 1];
      if (!previous) return;

      const newPast = history.past.slice(0, -1);
      const currentSnapshot: CanvasHistorySnapshot = {
        annotations: JSON.parse(JSON.stringify(annotations)),
        boundaryBox: { ...boundaryBox },
        pitchTransform: { ...pitchTransform },
      };

      set({
        annotations: previous.annotations,
        boundaryBox: previous.boundaryBox,
        pitchTransform: previous.pitchTransform
          ? { ...previous.pitchTransform }
          : pitchTransform,
        history: {
          past: newPast,
          future: [currentSnapshot, ...history.future],
        },
      });
    },
    redo: () => {
      const { history, annotations, boundaryBox, pitchTransform } = get();
      if (history.future.length === 0) return;
      const next = history.future[0];
      if (!next) return;

      const newFuture = history.future.slice(1);
      const currentSnapshot: CanvasHistorySnapshot = {
        annotations: JSON.parse(JSON.stringify(annotations)),
        boundaryBox: { ...boundaryBox },
        pitchTransform: { ...pitchTransform },
      };

      set({
        annotations: next.annotations,
        boundaryBox: next.boundaryBox,
        pitchTransform: next.pitchTransform
          ? { ...next.pitchTransform }
          : pitchTransform,
        history: {
          past: [...history.past, currentSnapshot],
          future: newFuture,
        },
      });
    },
    canUndo: () => get().history.past.length > 0,
    canRedo: () => get().history.future.length > 0,
  };
}
