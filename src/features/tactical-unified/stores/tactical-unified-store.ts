/**
 * tactical-unified-store.ts
 * Zustand Store — Unified Tactical Canvas
 *
 * 各種スライス（Project, Pitch, Slide, Annotation, Clipboard, History, Tool）を
 * 統合し、単一のStoreインスタンスとして提供する。
 */

import { temporal } from 'zundo';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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

export const useTacticalUnifiedStore = create<TacticalUnifiedState>()(
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
              ensureTacticalProject(next.project);
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
          ensureTacticalProject(partial.project);
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

      return {
        ...createHistorySlice(wrappedSet, get, store),
        ...createClipboardSlice(wrappedSet, get, store),
        ...createSlideSlice(wrappedSet, get, store),
        ...createAnnotationSlice(wrappedSet, get, store),
        ...createToolSlice(wrappedSet, get, store),
        ...createPitchSlice(wrappedSet, get, store),
        ...createProjectSlice(wrappedSet, get, store),
      };
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
