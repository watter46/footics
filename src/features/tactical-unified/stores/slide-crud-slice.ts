import type { StateCreator } from 'zustand';
import { createSlideForMode, resolvePanelStateForSlide } from './slide-helpers';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlideCrudSlice {
  addSlide: (
    sourceSlideId?: string,
    mode?: 'object-free' | 'full' | 'blank',
  ) => string;
  duplicateSlide: (slideId: string) => string;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (orderedIds: string[]) => void;
  setActiveSlide: (slideId: string) => void;
  updateSlideLabel: (slideId: string, label: string) => void;
}

export const createSlideCrudSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideCrudSlice
> = (set, get) => ({
  addSlide: (sourceSlideId, mode = 'object-free') => {
    const p = get().project;
    const targetId = sourceSlideId ?? get().activeSlideId;
    const currentSlide = p.slides.find((sl) => sl.id === targetId);
    const newSlide = createSlideForMode(currentSlide, p, mode);

    set((s) => {
      const currentIdx = s.project.slides.findIndex((sl) => sl.id === targetId);
      const nextSlides = [...s.project.slides];
      if (currentIdx !== -1) {
        nextSlides.splice(currentIdx + 1, 0, newSlide);
      } else {
        nextSlides.push(newSlide);
      }
      const indexedSlides = nextSlides.map((sl, i) => ({ ...sl, index: i }));

      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: newSlide.backgroundType ?? 'pitch',
          backgroundImageUrl: newSlide.backgroundImageUrl,
          slides: indexedSlides,
          activeSlideId: newSlide.id,
          updatedAt: new Date().toISOString(),
        },
        panels: resolvePanelStateForSlide(
          newSlide,
          s.panels,
          mode === 'blank' ? 'formation' : s.panels.rightPanelTab,
        ),
        activeSlideId: newSlide.id,
        selectedObjects: [],
        isDirty: true,
      };
    });

    return newSlide.id;
  },

  duplicateSlide: (slideId) => {
    return get().addSlide(slideId, 'full');
  },

  deleteSlide: (slideId) =>
    set((s) => {
      if (s.project.slides.length <= 1) return s;
      const remaining = s.project.slides
        .filter((sl) => sl.id !== slideId)
        .map((sl, i) => ({ ...sl, index: i }));
      const newActive =
        s.activeSlideId === slideId
          ? (remaining[0]?.id ?? remaining[remaining.length - 1]?.id ?? '')
          : s.activeSlideId;
      const activeSlideObj = remaining.find((sl) => sl.id === newActive);
      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: activeSlideObj?.backgroundType ?? 'pitch',
          backgroundImageUrl: activeSlideObj?.backgroundImageUrl,
          slides: remaining,
          activeSlideId: newActive,
          updatedAt: new Date().toISOString(),
        },
        panels: resolvePanelStateForSlide(activeSlideObj, s.panels),
        activeSlideId: newActive,
        isDirty: true,
      };
    }),

  reorderSlides: (orderedIds) =>
    set((s) => {
      const idToSlide = Object.fromEntries(
        s.project.slides.map((sl) => [sl.id, sl]),
      );
      const slides = orderedIds
        .map((id, i) => {
          const sl = idToSlide[id];
          return sl ? { ...sl, index: i } : null;
        })
        .filter((sl): sl is NonNullable<typeof sl> => sl !== null);
      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          slides,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

  setActiveSlide: (slideId) =>
    set((s) => {
      const targetSlide = s.project.slides.find((sl) => sl.id === slideId);
      return {
        activeSlideId: slideId,
        selectedObjects: [],
        project: {
          ...s.project,
          backgroundType: targetSlide?.backgroundType ?? 'pitch',
          backgroundImageUrl: targetSlide?.backgroundImageUrl,
        },
        panels: resolvePanelStateForSlide(targetSlide, s.panels),
      };
    }),

  updateSlideLabel: (slideId, label) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        label,
      })),
      isDirty: true,
    })),
});
