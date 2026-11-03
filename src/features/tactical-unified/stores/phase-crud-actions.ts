import type {
  Slide,
  TacticalPhase,
  TacticalProject,
} from '@/lib/types/tactical-unified';
import { createDefaultPhase } from '@/lib/types/tactical-unified';
import { resolvePanelStateForSlide } from './slide-helpers';
import { recordHistory } from './store-helpers';
import type { PanelState, SelectedObject } from './tool-types';

export interface PhaseStoreState {
  project: TacticalProject;
  activePhaseId: string;
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  isDirty: boolean;
  panels: PanelState;
  past: TacticalPhase[][];
  future: TacticalPhase[][];
}

type StoreSetter = (
  fn: (state: PhaseStoreState) => Partial<PhaseStoreState>,
) => void;
type StoreGetter = () => PhaseStoreState;

export function createPhaseCrudActions(set: StoreSetter, get: StoreGetter) {
  return {
    addPhase: (name?: string): string => {
      const p = get().project;
      const nextIdx = p.phases.length;
      const newPhase = createDefaultPhase(
        undefined,
        name ?? `Phase ${nextIdx + 1}`,
        p.homeColor.primary,
        p.awayColor.primary,
      );
      const newSlideId = newPhase.slides[0].id;

      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          phases: [...s.project.phases, newPhase],
          activePhaseId: newPhase.id,
          activeSlideId: newSlideId,
          updatedAt: new Date().toISOString(),
        },
        activePhaseId: newPhase.id,
        activeSlideId: newSlideId,
        selectedObjects: [],
        isDirty: true,
      }));

      return newPhase.id;
    },

    deletePhase: (phaseId: string): void =>
      set((s) => {
        if (s.project.phases.length <= 1) return s;
        const targetIdx = s.project.phases.findIndex((p) => p.id === phaseId);
        if (targetIdx === -1) return s;

        const remaining = s.project.phases.filter((p) => p.id !== phaseId);
        let nextActivePhaseId = s.activePhaseId;
        let nextActiveSlideId = s.activeSlideId;

        if (s.activePhaseId === phaseId) {
          const nextPhase =
            remaining[Math.min(targetIdx, remaining.length - 1)] ??
            remaining[0];
          nextActivePhaseId = nextPhase.id;
          nextActiveSlideId = nextPhase.slides[0]?.id ?? '';
        }

        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            phases: remaining,
            activePhaseId: nextActivePhaseId,
            activeSlideId: nextActiveSlideId,
            updatedAt: new Date().toISOString(),
          },
          activePhaseId: nextActivePhaseId,
          activeSlideId: nextActiveSlideId,
          selectedObjects: [],
          isDirty: true,
        };
      }),

    renamePhase: (phaseId: string, name: string): void =>
      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          phases: s.project.phases.map((ph) =>
            ph.id === phaseId ? { ...ph, name } : ph,
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    setActivePhase: (phaseId: string): void =>
      set((s) => {
        const targetPhase = s.project.phases.find((p) => p.id === phaseId);
        if (!targetPhase) return s;
        const targetSlide = targetPhase.slides[0];
        const nextSlideId = targetSlide?.id ?? '';
        const nextBgType = targetSlide?.backgroundType ?? 'pitch';
        const nextBgUrl = targetSlide?.backgroundImageUrl;

        return {
          activePhaseId: phaseId,
          activeSlideId: nextSlideId,
          selectedObjects: [],
          project: {
            ...s.project,
            activePhaseId: phaseId,
            activeSlideId: nextSlideId,
            backgroundType: nextBgType,
            backgroundImageUrl: nextBgUrl,
          },
          panels: resolvePanelStateForSlide(targetSlide, s.panels),
        };
      }),

    selectPhaseAndSlide: (phaseId: string, slideId: string): void =>
      set((s) => {
        const targetPhase = s.project.phases.find((p) => p.id === phaseId);
        const targetSlide = targetPhase?.slides.find((sl) => sl.id === slideId);
        const nextBgType = targetSlide?.backgroundType ?? 'pitch';
        const nextBgUrl = targetSlide?.backgroundImageUrl;

        return {
          activePhaseId: phaseId,
          activeSlideId: slideId,
          selectedObjects: [],
          project: {
            ...s.project,
            activePhaseId: phaseId,
            activeSlideId: slideId,
            backgroundType: nextBgType,
            backgroundImageUrl: nextBgUrl,
          },
          panels: resolvePanelStateForSlide(targetSlide, s.panels),
        };
      }),
  };
}
