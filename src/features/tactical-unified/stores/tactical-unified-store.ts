/**
 * tactical-unified-store.ts
 * Zustand Store — Unified Tactical Canvas
 *
 * 各種スライス（Project, Pitch, Slide, Annotation, Clipboard, History, Tool）を
 * 統合し、単一のStoreインスタンスとして提供する。
 */

import { createContext, useContext } from 'react';
import { temporal } from 'zundo';
import { useStore } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createStore } from 'zustand/vanilla';
import { ensureTacticalProject } from '@/lib/types/tactical-unified';
import {
  type AnnotationSlice,
  createAnnotationSlice,
} from './annotation-slice';
import { computePitchFitBoundaryBox } from './boundary-box-helpers';
import {
  cloneAndOffsetObjects,
  extractSelectedObjects,
  type TacticalClipboard,
} from './clipboard-helpers';
import { type ClipboardSlice, createClipboardSlice } from './clipboard-slice';
import { createHistorySlice, type HistorySlice } from './history-slice';
import { createPitchSlice, type PitchSlice } from './pitch-slice';
import { createProjectSlice, type ProjectSlice } from './project-slice';
import { createSlideSlice, type SlideSlice } from './slide-slice';
import {
  getSlide,
  MAX_HISTORY,
  recordHistory,
  updateSlideInProject,
} from './store-helpers';
import { distToSegment, isPointInPolygon } from './tactical-geometry-helpers';
import {
  type selectActivePhase,
  type selectActivePhaseSlides,
  selectActiveSlide,
  selectCanRedo,
  selectCanUndo,
  selectIsMultiSlide,
  selectPreviousSlide,
  selectSingleSelectedId,
} from './tactical-unified-selectors';
import {
  createToolSlice,
  type MarkerOptionTab,
  type PanelState,
  type SelectedObject,
  type SelectedObjectKind,
  type ToolSlice,
} from './tool-slice';

// ─────────────────────────────────────────
// § 1. 後方互換用 Re-export
// ─────────────────────────────────────────

export type {
  AnnotationSlice,
  MarkerOptionTab,
  PanelState,
  PitchSlice,
  ProjectSlice,
  SelectedObject,
  SelectedObjectKind,
  TacticalClipboard,
  ToolSlice,
};

export {
  cloneAndOffsetObjects,
  computePitchFitBoundaryBox,
  distToSegment,
  extractSelectedObjects,
  getSlide,
  isPointInPolygon,
  MAX_HISTORY,
  recordHistory,
  type selectActivePhase,
  type selectActivePhaseSlides,
  selectActiveSlide,
  selectCanRedo,
  selectCanUndo,
  selectIsMultiSlide,
  selectPreviousSlide,
  selectSingleSelectedId,
  updateSlideInProject,
};

// ─────────────────────────────────────────
// § 2. Store State 型
// ─────────────────────────────────────────

export interface TacticalUnifiedState
  extends HistorySlice,
    ClipboardSlice,
    Omit<SlideSlice, 'setPitchPosition'>,
    AnnotationSlice,
    ToolSlice,
    PitchSlice,
    ProjectSlice {}

// ─────────────────────────────────────────
// § 3. Store 実装
// ─────────────────────────────────────────

export function createTacticalUnifiedStore(
  initial?: Partial<TacticalUnifiedState>,
) {
  const initialNormalizedProject = initial?.project
    ? ensureTacticalProject(initial.project)
    : undefined;

  return createStore<TacticalUnifiedState>()(
    temporal(
      subscribeWithSelector((set, get, store) => {
        const interceptProject = (
          partial:
            | TacticalUnifiedState
            | Partial<TacticalUnifiedState>
            | ((
                state: TacticalUnifiedState,
              ) => TacticalUnifiedState | Partial<TacticalUnifiedState>),
        ) => {
          if (typeof partial === 'function') {
            return (state: TacticalUnifiedState) => {
              const next = partial(state);
              if (
                next &&
                typeof next === 'object' &&
                'project' in next &&
                next.project
              ) {
                return {
                  ...next,
                  project: ensureTacticalProject(next.project),
                };
              }
              return next;
            };
          }
          if (
            partial &&
            typeof partial === 'object' &&
            'project' in partial &&
            partial.project
          ) {
            return {
              ...partial,
              project: ensureTacticalProject(partial.project),
            };
          }
          return partial;
        };

        const wrappedSet: typeof set = (...args) => {
          const [partial, replace] = args;
          const intercepted = interceptProject(partial);
          if (replace) {
            set(
              intercepted as
                | TacticalUnifiedState
                | ((state: TacticalUnifiedState) => TacticalUnifiedState),
              true,
            );
          } else {
            set(intercepted, false);
          }
        };

        const origSetState = store.setState;
        store.setState = (...args) => {
          const [partial, replace] = args;
          const intercepted = interceptProject(partial);
          if (replace) {
            origSetState(
              intercepted as
                | TacticalUnifiedState
                | ((state: TacticalUnifiedState) => TacticalUnifiedState),
              true,
            );
          } else {
            origSetState(intercepted, false);
          }
        };

        const baseState = {
          ...createHistorySlice(wrappedSet, get, store),
          ...createClipboardSlice(wrappedSet, get, store),
          ...createSlideSlice(wrappedSet, get, store),
          ...createAnnotationSlice(wrappedSet, get, store),
          ...createToolSlice(wrappedSet, get, store),
          ...createPitchSlice(wrappedSet, get, store),
          ...createProjectSlice(wrappedSet, get, store),
        };

        if (initial) {
          if (initialNormalizedProject) {
            return {
              ...baseState,
              ...initial,
              project: initialNormalizedProject,
              activePhaseId:
                initial.activePhaseId ?? initialNormalizedProject.activePhaseId,
              activeSlideId:
                initial.activeSlideId ?? initialNormalizedProject.activeSlideId,
            };
          }
          return { ...baseState, ...initial };
        }
        return baseState;
      }),
      {
        limit: MAX_HISTORY,
        partialize: (state) => ({
          project: state.project,
          activeSlideId: state.activeSlideId,
        }),
      },
    ),
  );
}

export type TacticalUnifiedStoreApi = ReturnType<
  typeof createTacticalUnifiedStore
>;

export const TacticalUnifiedStoreContext =
  createContext<TacticalUnifiedStoreApi | null>(null);

export const defaultTacticalUnifiedStore = createTacticalUnifiedStore();

const identity = (state: TacticalUnifiedState) => state;

export interface UseTacticalUnifiedStore extends TacticalUnifiedStoreApi {
  (): TacticalUnifiedState;
  <T>(selector: (state: TacticalUnifiedState) => T): T;
}

function useTacticalUnifiedStoreImpl(): TacticalUnifiedState;
function useTacticalUnifiedStoreImpl<T>(
  selector: (state: TacticalUnifiedState) => T,
): T;
function useTacticalUnifiedStoreImpl<T>(
  selector?: (state: TacticalUnifiedState) => T,
): T {
  const contextStore = useContext(TacticalUnifiedStoreContext);
  return useStore(
    contextStore ?? defaultTacticalUnifiedStore,
    selector ?? (identity as (state: TacticalUnifiedState) => T),
  );
}

export const useTacticalUnifiedStore: UseTacticalUnifiedStore = Object.assign(
  useTacticalUnifiedStoreImpl,
  defaultTacticalUnifiedStore,
);
