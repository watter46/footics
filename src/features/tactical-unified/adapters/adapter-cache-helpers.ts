import type {
  ArrowAnnotation,
  Player,
  Slide,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import type {
  AnnotationsData,
  CanvasStore,
  DrawingPreviewState,
  SelectedObject,
} from '../core/types';

export const DEFAULT_CAPABILITIES: CanvasStore['capabilities'] = {
  hasBall: true,
  hasPitchLock: true,
  hasBench: true,
  paddingRatio: 0,
};

export const DEFAULT_HISTORY: CanvasStore['history'] = {
  past: [],
  future: [],
};

export const DEFAULT_BALL: CanvasStore['ball'] = {
  x: 50,
  y: 50,
  visible: true,
};

const EMPTY_ARR: [] = [];

export interface LocalAdapterState {
  drawingPreview: DrawingPreviewState | null;
  isDragging: boolean;
  isHudOpen: boolean;
  color: string;
  strokeWidth: number;
  fontSize: number;
  customColor: string;
  markerMode: '2d-only' | '3d-only' | 'all';
}

export function createInitialLocalState(): LocalAdapterState {
  return {
    drawingPreview: null,
    isDragging: false,
    isHudOpen: true,
    color: '#ffffff',
    strokeWidth: 2,
    fontSize: 14,
    customColor: '#ffffff',
    markerMode: 'all',
  };
}

export function applyLocalStatePartial(
  local: LocalAdapterState,
  next: Partial<CanvasStore>,
): boolean {
  let changed = false;
  if (
    next.drawingPreview !== undefined &&
    next.drawingPreview !== local.drawingPreview
  ) {
    local.drawingPreview = next.drawingPreview ?? null;
    changed = true;
  }
  if (next.isDragging !== undefined && next.isDragging !== local.isDragging) {
    local.isDragging = next.isDragging;
    changed = true;
  }
  if (next.isHudOpen !== undefined && next.isHudOpen !== local.isHudOpen) {
    local.isHudOpen = next.isHudOpen;
    changed = true;
  }
  if (next.markerMode !== undefined && next.markerMode !== local.markerMode) {
    local.markerMode = next.markerMode;
    changed = true;
  }
  if (
    next.customColor !== undefined &&
    next.customColor !== local.customColor
  ) {
    local.customColor = next.customColor;
    changed = true;
  }
  return changed;
}

export function createAnnotationCache() {
  let prevArrows: ArrowAnnotation[] | undefined;
  let prevZones: ZoneAnnotation[] | undefined;
  let prevTexts: TextAnnotation[] | undefined;
  let prevMarkers: Player[] | undefined;
  let cachedAnnotations: AnnotationsData = {
    arrows: EMPTY_ARR,
    zones: EMPTY_ARR,
    texts: EMPTY_ARR,
    markers: EMPTY_ARR,
  };

  return function getAnnotations(slide: Slide | undefined): AnnotationsData {
    const a = slide?.arrows ?? EMPTY_ARR;
    const z = slide?.zones ?? EMPTY_ARR;
    const t = slide?.texts ?? EMPTY_ARR;
    const m = slide?.players ?? EMPTY_ARR;
    if (
      a === prevArrows &&
      z === prevZones &&
      t === prevTexts &&
      m === prevMarkers
    ) {
      return cachedAnnotations;
    }
    prevArrows = a;
    prevZones = z;
    prevTexts = t;
    prevMarkers = m;
    cachedAnnotations = { arrows: a, zones: z, texts: t, markers: m };
    return cachedAnnotations;
  };
}

export function createSelectedIdsCache() {
  let prevSelectedObjects: readonly SelectedObject[] | undefined;
  let cachedSelectedIds: string[] = [];

  return function getSelectedIds(objects: readonly SelectedObject[]): string[] {
    if (objects === prevSelectedObjects) return cachedSelectedIds;
    const ids = objects.map((o) => o.id);
    if (
      cachedSelectedIds.length === ids.length &&
      cachedSelectedIds.every((id, i) => id === ids[i])
    ) {
      prevSelectedObjects = objects;
      return cachedSelectedIds;
    }
    prevSelectedObjects = objects;
    cachedSelectedIds = ids;
    return cachedSelectedIds;
  };
}
