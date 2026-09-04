/**
 * tactical-unified-store.ts
 * Zustand Store — Unified Tactical Canvas
 *
 * 各種スライス（Project, Pitch, Slide, Annotation, Clipboard, History, Tool）を
 * 統合し、単一のStoreインスタンスとして提供する。
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
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
  subscribeWithSelector((set, get, store) => ({
    ...createHistorySlice(set, get, store),
    ...createClipboardSlice(set, get, store),
    ...createSlideSlice(set, get, store),
    ...createAnnotationSlice(set, get, store),
    ...createToolSlice(set, get, store),
    ...createPitchSlice(set, get, store),
    ...createProjectSlice(set, get, store),
  })),
);
