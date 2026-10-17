import type { StoreApi } from 'zustand/vanilla';
import type { AnnotationsData, CanvasActions, CanvasStore } from '../types';

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
  | 'removeMarker'
  | 'removeSelected'
  | 'setAnnotations'
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
    removeMarker: (id) => {
      pushHistory();
      set((s) => ({
        annotations: {
          ...s.annotations,
          markers: removeItem(s.annotations.markers, id),
        },
      }));
    },
    removeSelected: () => {
      const { selectedIds, annotations } = get();
      if (selectedIds.length === 0) return;
      pushHistory();
      set({
        annotations: {
          arrows: annotations.arrows.filter((a) => !selectedIds.includes(a.id)),
          zones: annotations.zones.filter((z) => !selectedIds.includes(z.id)),
          texts: annotations.texts.filter((t) => !selectedIds.includes(t.id)),
          markers: annotations.markers.filter(
            (m) => !selectedIds.includes(m.id),
          ),
        },
        selectedIds: [],
      });
    },
    setAnnotations: (annotations: AnnotationsData) => {
      pushHistory();
      set({ annotations });
    },
  };
}
