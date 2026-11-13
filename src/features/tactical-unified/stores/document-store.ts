import { createStore, type StoreApi } from 'zustand';
import type {
  SlideCommand,
  TacticalCommand,
} from '@/lib/tactical/domain/commands';
import { applyTacticalCommand } from '@/lib/tactical/domain/project-reducer';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';

export const MAX_HISTORY_LENGTH = 50;

export interface DocumentStoreState {
  readonly project: DomainTacticalProject;
  readonly past: readonly DomainTacticalProject[];
  readonly future: readonly DomainTacticalProject[];
  readonly isDirty: boolean;
  readonly dispatch: (command: TacticalCommand) => void;
  readonly dispatchSlide: (
    phaseId: string,
    slideId: string,
    command: SlideCommand,
  ) => void;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly loadProject: (project: DomainTacticalProject) => void;
  readonly markSaved: () => void;
}

export type DocumentStore = StoreApi<DocumentStoreState>;

export function createDocumentStore(
  initialProject: DomainTacticalProject,
): DocumentStore {
  return createStore<DocumentStoreState>((set, get) => ({
    project: initialProject,
    past: [],
    future: [],
    isDirty: false,

    dispatch: (command: TacticalCommand) => {
      const currentProject = get().project;
      const nextProject = applyTacticalCommand(currentProject, command);
      if (nextProject === currentProject) {
        return;
      }

      set((state) => {
        const nextPast = [
          ...state.past.slice(-(MAX_HISTORY_LENGTH - 1)),
          state.project,
        ];
        return {
          project: nextProject,
          past: nextPast,
          future: [],
          isDirty: true,
        };
      });
    },

    dispatchSlide: (
      phaseId: string,
      slideId: string,
      command: SlideCommand,
    ) => {
      get().dispatch({
        type: 'APPLY_SLIDE_COMMAND',
        phaseId,
        slideId,
        command,
      });
    },

    undo: () => {
      const { past, project, future } = get();
      if (past.length === 0) return;

      const previous = past[past.length - 1];
      if (!previous) return;

      const nextPast = past.slice(0, -1);
      const nextFuture = [project, ...future];

      set({
        project: previous,
        past: nextPast,
        future: nextFuture,
        isDirty: true,
      });
    },

    redo: () => {
      const { past, project, future } = get();
      if (future.length === 0) return;

      const next = future[0];
      if (!next) return;

      const nextFuture = future.slice(1);
      const nextPast = [...past, project];

      set({
        project: next,
        past: nextPast,
        future: nextFuture,
        isDirty: true,
      });
    },

    canUndo: () => get().past.length > 0,

    canRedo: () => get().future.length > 0,

    loadProject: (project: DomainTacticalProject) => {
      set({
        project,
        past: [],
        future: [],
        isDirty: false,
      });
    },

    markSaved: () => {
      set({ isDirty: false });
    },
  }));
}
