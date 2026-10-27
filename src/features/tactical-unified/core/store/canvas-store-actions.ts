import type { StoreApi } from 'zustand/vanilla';
import type { AnnotationsData, CanvasActions, CanvasStore } from '../types';
import {
  cascadeRemoveMarker,
  cascadeRemoveSelected,
} from './canvas-store-cascade';
import { eraseAnnotationsAtPoint } from './canvas-store-eraser';

type SetState = StoreApi<CanvasStore>['setState'];
type GetState = StoreApi<CanvasStore>['getState'];

const updateItem = <T extends { id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>,
): T[] => list.map((it) => (it.id === id ? { ...it, ...patch } : it));

const removeItem = <T extends { id: string }>(list: T[], id: string): T[] =>
  list.filter((it) => it.id !== id);

export function createAnnotationActions(
  set: SetState,
  get: GetState,
  pushHistory: () => void,
): Pick<
  CanvasActions,
  | 'addArrow'
  | 'updateArrow'
  | 'removeArrow'
  | 'addZone'
  | 'updateZone'
  | 'removeZone'
  | 'addText'
  | 'updateText'
  | 'removeText'
  | 'addMarker'
  | 'updateMarker'
  | 'updateMarkers'
  | 'removeMarker'
  | 'moveMarkerToBench'
  | 'removeSelected'
  | 'setAnnotations'
  | 'eraseAtPoint'
> {
  return {
    addArrow: (arrow) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          arrows: [...s.annotations.arrows, arrow],
        },
      }));
    },
    updateArrow: (id, patch) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          arrows: updateItem(s.annotations.arrows, id, patch),
        },
      }));
    },
    removeArrow: (id) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          arrows: removeItem(s.annotations.arrows, id),
        },
      }));
    },
    addZone: (zone) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          zones: [...s.annotations.zones, zone],
        },
      }));
    },
    updateZone: (id, patch) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          zones: updateItem(s.annotations.zones, id, patch),
        },
      }));
    },
    removeZone: (id) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          zones: removeItem(s.annotations.zones, id),
        },
      }));
    },
    addText: (text) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          texts: [...s.annotations.texts, text],
        },
      }));
    },
    updateText: (id, patch) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          texts: updateItem(s.annotations.texts, id, patch),
        },
      }));
    },
    removeText: (id) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          texts: removeItem(s.annotations.texts, id),
        },
      }));
    },
    addMarker: (marker) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          markers: [...s.annotations.markers, marker],
        },
      }));
    },
    updateMarker: (id, patch) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          markers: updateItem(s.annotations.markers, id, patch),
        },
      }));
    },
    updateMarkers: (updates) => {
      if (updates.length === 0) return;
      pushHistory();
      const patchMap = new Map(updates.map((u) => [u.id, u.patch]));
      set((s) => ({
        annotations: {
          ...s.annotations,
          markers: s.annotations.markers.map((m) => {
            const patch = patchMap.get(m.id);
            return patch ? { ...m, ...patch } : m;
          }),
        },
      }));
    },
    removeMarker: (id) => {
      pushHistory();
      set((s) => ({
        annotations: cascadeRemoveMarker(s.annotations, id),
      }));
    },
    moveMarkerToBench: (id, _x, _y) => {
      pushHistory();
      set((s) => ({
        annotations: cascadeRemoveMarker(s.annotations, id),
      }));
    },
    removeSelected: () => {
      const { selectedIds, selectedObjects, annotations } = get();
      const idSet = new Set(
        selectedObjects.length > 0
          ? selectedObjects.map((o) => o.id)
          : selectedIds,
      );
      if (idSet.size === 0) return;
      pushHistory();
      set({
        annotations: cascadeRemoveSelected(annotations, idSet),
        selectedIds: [],
        selectedObjects: [],
      });
    },
    setAnnotations: (annotations: AnnotationsData) => {
      pushHistory();
      set({ annotations });
    },
    eraseAtPoint: (point, radius = 4.0) => {
      const { annotations } = get();
      const { nextAnnotations, hasChanged } = eraseAnnotationsAtPoint(
        annotations,
        point,
        radius,
      );
      if (!hasChanged) return;
      pushHistory();
      set({ annotations: nextAnnotations });
    },
  };
}
