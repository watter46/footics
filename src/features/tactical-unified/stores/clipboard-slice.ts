import type { StateCreator } from 'zustand';
import type {
  TacticalClipboard,
  TacticalUnifiedState,
} from './tactical-unified-store';
import {
  cloneAndOffsetObjects,
  extractSelectedObjects,
  getSlide,
  recordHistory,
  updateSlideInProject,
} from './tactical-unified-store';

export interface ClipboardSlice {
  clipboard: TacticalClipboard | null;
  copySelectedObjects: (slideId?: string) => void;
  pasteObjects: (slideId?: string) => void;
  duplicateSelectedObjects: (slideId?: string) => void;
}

export const createClipboardSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  ClipboardSlice
> = (set, get, _store) => ({
  clipboard: null,
  copySelectedObjects: (slideId) => {
    const state = get();
    const targetSlideId = slideId ?? state.activeSlideId;
    const slide = getSlide(state.project, targetSlideId);
    if (!slide || state.selectedObjects.length === 0) return;

    const { players, arrows, zones, texts } = extractSelectedObjects(
      slide,
      state.selectedObjects,
    );

    if (
      players.length === 0 &&
      arrows.length === 0 &&
      zones.length === 0 &&
      texts.length === 0
    ) {
      return;
    }

    set({
      clipboard: {
        players,
        arrows,
        zones,
        texts,
      },
    });
  },
  pasteObjects: (slideId) => {
    const state = get();
    const clipboard = state.clipboard;
    if (!clipboard) return;

    const { players, arrows, zones, texts } = clipboard;
    if (
      players.length === 0 &&
      arrows.length === 0 &&
      zones.length === 0 &&
      texts.length === 0
    ) {
      return;
    }

    const targetSlideId = slideId ?? state.activeSlideId;
    const slide = getSlide(state.project, targetSlideId);
    if (!slide) return;

    const { newPlayers, newArrows, newZones, newTexts, newSelectedObjects } =
      cloneAndOffsetObjects({ players, arrows, zones, texts });

    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
        ...sl,
        players: [...sl.players, ...newPlayers],
        arrows: [...sl.arrows, ...newArrows],
        zones: [...sl.zones, ...newZones],
        texts: [...sl.texts, ...newTexts],
      })),
      isDirty: true,
      selectedObjects: newSelectedObjects,
      panels: {
        ...s.panels,
        inspectorOpen: true,
        rightPanelTab: 'inspector',
      },
    }));
  },
  duplicateSelectedObjects: (slideId) => {
    const state = get();
    const targetSlideId = slideId ?? state.activeSlideId;
    const slide = getSlide(state.project, targetSlideId);
    if (!slide || state.selectedObjects.length === 0) return;

    const { players, arrows, zones, texts } = extractSelectedObjects(
      slide,
      state.selectedObjects,
    );

    if (
      players.length === 0 &&
      arrows.length === 0 &&
      zones.length === 0 &&
      texts.length === 0
    ) {
      return;
    }

    const { newPlayers, newArrows, newZones, newTexts, newSelectedObjects } =
      cloneAndOffsetObjects({ players, arrows, zones, texts });

    set((s) => ({
      ...recordHistory(s),
      clipboard: {
        players,
        arrows,
        zones,
        texts,
      },
      project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
        ...sl,
        players: [...sl.players, ...newPlayers],
        arrows: [...sl.arrows, ...newArrows],
        zones: [...sl.zones, ...newZones],
        texts: [...sl.texts, ...newTexts],
      })),
      isDirty: true,
      selectedObjects: newSelectedObjects,
      panels: {
        ...s.panels,
        inspectorOpen: true,
        rightPanelTab: 'inspector',
      },
    }));
  },
});
