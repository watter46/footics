import type { StateCreator } from 'zustand';
import type { Slide } from '@/lib/types/tactical-unified';
import { DEFAULT_BOUNDARY_BOX_16_9 } from '@/lib/types/tactical-unified';
import { createPhaseCrudActions } from './phase-crud-actions';
import { createSlideForMode, resolvePanelStateForSlide } from './slide-helpers';
import { recordHistory, updateSlideInProject } from './store-helpers';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface SlideCrudSlice {
  addPhase: (name?: string) => string;
  deletePhase: (phaseId: string) => void;
  renamePhase: (phaseId: string, name: string) => void;
  setActivePhase: (phaseId: string) => void;
  selectPhaseAndSlide: (phaseId: string, slideId: string) => void;
  addSlide: (
    sourceSlideId?: string,
    mode?: 'object-free' | 'full' | 'blank',
  ) => string;
  duplicateSlide: (slideId: string) => string;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (orderedIds: string[]) => void;
  setActiveSlide: (slideId: string) => void;
  updateSlideLabel: (slideId: string, label: string) => void;
  updateSlide: (slideId: string, patch: Partial<Slide>) => void;
}

export const createSlideCrudSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideCrudSlice
> = (set, get) => ({
  ...createPhaseCrudActions(set, get),

  addSlide: (sourceSlideId, mode = 'object-free') => {
    const p = get().project;
    const activePhaseId = get().activePhaseId;
    const activePhase =
      p.phases.find((ph) => ph.id === activePhaseId) ?? p.phases[0];
    const targetId = sourceSlideId ?? get().activeSlideId;
    const currentSlide = activePhase.slides.find((sl) => sl.id === targetId);
    const newSlide = createSlideForMode(
      currentSlide,
      p,
      mode,
      activePhase.slides.length,
    );

    set((s) => {
      const currentPh =
        s.project.phases.find((ph) => ph.id === activePhase.id) ??
        s.project.phases[0];
      const currentIdx = currentPh.slides.findIndex((sl) => sl.id === targetId);
      const nextSlides = [...currentPh.slides];
      if (currentIdx !== -1) {
        nextSlides.splice(currentIdx + 1, 0, newSlide);
      } else {
        nextSlides.push(newSlide);
      }
      const indexedSlides = nextSlides.map((sl, i) => ({ ...sl, index: i }));

      const nextPhases = s.project.phases.map((ph) =>
        ph.id === currentPh.id ? { ...ph, slides: indexedSlides } : ph,
      );

      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: newSlide.backgroundType ?? 'pitch',
          backgroundImageUrl: newSlide.backgroundImageUrl,
          phases: nextPhases,
          activePhaseId: currentPh.id,
          activeSlideId: newSlide.id,
          updatedAt: new Date().toISOString(),
        },
        panels: resolvePanelStateForSlide(
          newSlide,
          s.panels,
          mode === 'blank' ? 'formation' : s.panels.rightPanelTab,
        ),
        activePhaseId: currentPh.id,
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
      const activePhase =
        s.project.phases.find((ph) => ph.id === s.activePhaseId) ??
        s.project.phases.find((ph) =>
          ph.slides.some((sl) => sl.id === slideId),
        ) ??
        s.project.phases[0];

      if (!activePhase || activePhase.slides.length <= 1) return s;

      const remaining = activePhase.slides
        .filter((sl) => sl.id !== slideId)
        .map((sl, i) => ({ ...sl, index: i }));

      const newActive =
        s.activeSlideId === slideId
          ? (remaining[0]?.id ?? remaining[remaining.length - 1]?.id ?? '')
          : s.activeSlideId;
      const activeSlideObj = remaining.find((sl) => sl.id === newActive);

      const nextPhases = s.project.phases.map((ph) =>
        ph.id === activePhase.id ? { ...ph, slides: remaining } : ph,
      );

      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: activeSlideObj?.backgroundType ?? 'pitch',
          backgroundImageUrl: activeSlideObj?.backgroundImageUrl,
          phases: nextPhases,
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
      const activePhase =
        s.project.phases.find((ph) => ph.id === s.activePhaseId) ??
        s.project.phases[0];
      if (!activePhase) return s;

      const idToSlide = Object.fromEntries(
        activePhase.slides.map((sl) => [sl.id, sl]),
      );
      const slides = orderedIds
        .map((id, i) => {
          const sl = idToSlide[id];
          return sl ? { ...sl, index: i } : null;
        })
        .filter((sl): sl is NonNullable<typeof sl> => sl !== null);

      const nextPhases = s.project.phases.map((ph) =>
        ph.id === activePhase.id ? { ...ph, slides } : ph,
      );

      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          phases: nextPhases,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };
    }),

  setActiveSlide: (slideId) =>
    set((s) => {
      let targetPhase = s.project.phases.find(
        (ph) => ph.id === s.activePhaseId,
      );
      let targetSlide = targetPhase?.slides.find((sl) => sl.id === slideId);

      if (!targetSlide) {
        targetPhase = s.project.phases.find((ph) =>
          ph.slides.some((sl) => sl.id === slideId),
        );
        targetSlide = targetPhase?.slides.find((sl) => sl.id === slideId);
      }

      const nextBgType = targetSlide?.backgroundType ?? 'pitch';
      const nextBgUrl = targetSlide?.backgroundImageUrl;
      const nextPhaseId = targetPhase?.id ?? s.activePhaseId;
      const nextAspect =
        targetPhase?.aspectRatio ?? s.project.aspectRatio ?? '16:9';
      const nextBoundary =
        targetPhase?.boundaryBox ??
        s.project.boundaryBox ??
        DEFAULT_BOUNDARY_BOX_16_9;

      return {
        activePhaseId: nextPhaseId,
        activeSlideId: slideId,
        selectedObjects: [],
        project: {
          ...s.project,
          activePhaseId: nextPhaseId,
          activeSlideId: slideId,
          aspectRatio: nextAspect,
          boundaryBox: nextBoundary,
          backgroundType: nextBgType,
          backgroundImageUrl: nextBgUrl,
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

  updateSlide: (slideId, patch) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ...patch,
      })),
      isDirty: true,
    })),
});
