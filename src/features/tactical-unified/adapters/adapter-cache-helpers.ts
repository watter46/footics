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
