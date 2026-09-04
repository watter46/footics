/**
 * tactical-unified/types/index.ts
 * Unified Tactical Canvas Type Aggregator
 */

// ─────────────────────────────────────────
// § 1. Re-export Core Domain Types from lib/types/tactical-unified
// ─────────────────────────────────────────
export type {
  Arrow,
  ArrowAnnotation,
  AspectRatio,
  BallState,
  BoundaryBox,
  ConnectLine,
  DrawingTool,
  Easing,
  ExportProgress,
  ExportTarget,
  FormationPreset,
  MarkerStyle,
  NormalizedPoint,
  PitchTransform,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  SeasonFormationPreset,
  Slide,
  TacticalPlayer,
  TacticalProject,
  TacticalSlide,
  TextAnnotation,
  VisionCone,
  XMediaPresetConfig,
  XMediaPresetKey,
  XMediaRatio,
  Zone,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';

// ─────────────────────────────────────────
// § 2. Canvas & Interaction Types
// ─────────────────────────────────────────
export interface DrawingState {
  isDrawing: boolean;
  tool: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isShift: boolean;
}

export type { TacticalClipboard } from '../stores/clipboard-helpers';
export type { ClipboardSlice } from '../stores/clipboard-slice';
export type { HistorySlice } from '../stores/history-slice';

export type { SlideSlice } from '../stores/slide-slice';
export type {
  AnnotationSlice,
  PitchSlice,
  ProjectSlice,
  TacticalUnifiedState,
  ToolSlice,
} from '../stores/tactical-unified-store';
// ─────────────────────────────────────────
// § 3. Store, Selection & Clipboard Types
// ─────────────────────────────────────────
export type {
  MarkerOptionTab,
  PanelState,
  SelectedObject,
  SelectedObjectKind,
} from '../stores/tool-slice';
