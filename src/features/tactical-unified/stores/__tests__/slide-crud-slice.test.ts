import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDefaultPhase,
  createDefaultProject,
} from '@/lib/types/tactical-unified';
import {
  selectActivePhase,
  selectActivePhaseSlides,
  selectActiveSlide,
  selectIsMultiSlide,
  selectPreviousSlide,
} from '../tactical-unified-selectors';
import { useTacticalUnifiedStore } from '../tactical-unified-store';

describe('SlideCrudSlice - Phase and Slide operations', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  describe('Phase operations', () => {
    it('addPhase creates a new phase, sets it active, and activates its first slide', () => {
      const store = useTacticalUnifiedStore.getState();
      const initialPhaseId = store.activePhaseId;

      const newPhaseId = store.addPhase('Build-up Phase');
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.project.phases).toHaveLength(2);
      expect(newPhaseId).toBeTruthy();
      expect(updatedStore.activePhaseId).toBe(newPhaseId);

      const addedPhase = updatedStore.project.phases.find(
        (p) => p.id === newPhaseId,
      );
      expect(addedPhase).toBeDefined();
      expect(addedPhase?.name).toBe('Build-up Phase');
      expect(addedPhase?.slides).toHaveLength(1);
      expect(updatedStore.activeSlideId).toBe(addedPhase?.slides[0]?.id);
    });

    it('deletePhase deletes the specified phase and activates adjacent phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const firstPhaseId = store.activePhaseId;
      const secondPhaseId = store.addPhase('Second Phase');

      expect(useTacticalUnifiedStore.getState().project.phases).toHaveLength(2);
      expect(useTacticalUnifiedStore.getState().activePhaseId).toBe(
        secondPhaseId,
      );

      useTacticalUnifiedStore.getState().deletePhase(secondPhaseId);
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.project.phases).toHaveLength(1);
      expect(updatedStore.activePhaseId).toBe(firstPhaseId);
    });

    it('deletePhase does not delete the last remaining phase', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(store.project.phases).toHaveLength(1);
      const onlyPhaseId = store.activePhaseId;

      store.deletePhase(onlyPhaseId);
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.project.phases).toHaveLength(1);
      expect(updatedStore.activePhaseId).toBe(onlyPhaseId);
    });

    it('renamePhase renames the specified phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const phaseId = store.activePhaseId;

      store.renamePhase(phaseId, 'High Press');
      const updatedStore = useTacticalUnifiedStore.getState();

      const phase = updatedStore.project.phases.find((p) => p.id === phaseId);
      expect(phase?.name).toBe('High Press');
    });

    it('setActivePhase changes active phase and selects its first slide', () => {
      const store = useTacticalUnifiedStore.getState();
      const firstPhaseId = store.activePhaseId;
      const secondPhaseId = store.addPhase('Second Phase');

      expect(useTacticalUnifiedStore.getState().activePhaseId).toBe(
        secondPhaseId,
      );

      useTacticalUnifiedStore.getState().setActivePhase(firstPhaseId);
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.activePhaseId).toBe(firstPhaseId);
      const firstPhase = updatedStore.project.phases.find(
        (p) => p.id === firstPhaseId,
      );
      expect(updatedStore.activeSlideId).toBe(firstPhase?.slides[0]?.id);
    });

    it('selectPhaseAndSlide selects both phase and slide simultaneously', () => {
      const store = useTacticalUnifiedStore.getState();
      const firstPhaseId = store.activePhaseId;
      const secondPhaseId = store.addPhase('Second Phase');
      const storeAfterAdd = useTacticalUnifiedStore.getState();
      const secondSlideId = storeAfterAdd.addSlide();

      useTacticalUnifiedStore
        .getState()
        .selectPhaseAndSlide(
          firstPhaseId,
          store.project.phases[0].slides[0].id,
        );
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.activePhaseId).toBe(firstPhaseId);
      expect(updatedStore.activeSlideId).toBe(
        store.project.phases[0].slides[0].id,
      );

      useTacticalUnifiedStore
        .getState()
        .selectPhaseAndSlide(secondPhaseId, secondSlideId);
      const updatedStore2 = useTacticalUnifiedStore.getState();
      expect(updatedStore2.activePhaseId).toBe(secondPhaseId);
      expect(updatedStore2.activeSlideId).toBe(secondSlideId);
    });
  });

  describe('Slide operations scoped to active phase', () => {
    it('addSlide adds a slide only to the active phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const phase1Id = store.activePhaseId;
      const phase2Id = store.addPhase('Phase 2');

      // Now phase2 is active
      const newSlideId = useTacticalUnifiedStore.getState().addSlide();
      const state = useTacticalUnifiedStore.getState();

      const phase1 = state.project.phases.find((p) => p.id === phase1Id);
      const phase2 = state.project.phases.find((p) => p.id === phase2Id);

      expect(phase1?.slides).toHaveLength(1);
      expect(phase2?.slides).toHaveLength(2);
      expect(state.activeSlideId).toBe(newSlideId);
    });

    it('deleteSlide deletes a slide from the active phase and preserves other phases', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const slide2Id = store.addSlide();

      const stateBeforeDelete = useTacticalUnifiedStore.getState();
      expect(stateBeforeDelete.project.phases[0]?.slides).toHaveLength(2);

      useTacticalUnifiedStore.getState().deleteSlide(slide2Id);
      const stateAfterDelete = useTacticalUnifiedStore.getState();

      expect(stateAfterDelete.project.phases[0]?.slides).toHaveLength(1);
      expect(stateAfterDelete.activeSlideId).toBe(slide1Id);
    });

    it('deleteSlide does not delete the last slide in active phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const onlySlideId = store.activeSlideId;

      store.deleteSlide(onlySlideId);
      const updatedStore = useTacticalUnifiedStore.getState();

      expect(updatedStore.project.phases[0]?.slides).toHaveLength(1);
      expect(updatedStore.activeSlideId).toBe(onlySlideId);
    });

    it('reorderSlides reorders slides within the active phase', () => {
      const store = useTacticalUnifiedStore.getState();
      const slide1Id = store.activeSlideId;
      const slide2Id = store.addSlide();

      useTacticalUnifiedStore.getState().reorderSlides([slide2Id, slide1Id]);
      const updatedStore = useTacticalUnifiedStore.getState();

      const activePhase = updatedStore.project.phases[0];
      expect(activePhase.slides[0].id).toBe(slide2Id);
      expect(activePhase.slides[0].index).toBe(0);
      expect(activePhase.slides[1].id).toBe(slide1Id);
      expect(activePhase.slides[1].index).toBe(1);
    });
  });

  describe('Phase-aware selectors', () => {
    it('selectActivePhase and selectActivePhaseSlides return correct data', () => {
      const store = useTacticalUnifiedStore.getState();
      const activePhase = selectActivePhase(store);
      expect(activePhase).toBeDefined();
      expect(activePhase?.id).toBe(store.activePhaseId);

      const slides = selectActivePhaseSlides(store);
      expect(slides).toEqual(activePhase?.slides);
    });

    it('selectPreviousSlide returns previous slide in current phase or null', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(selectPreviousSlide(store)).toBeNull();

      const slide2Id = store.addSlide();
      const updatedStore = useTacticalUnifiedStore.getState();
      expect(updatedStore.activeSlideId).toBe(slide2Id);

      const prev = selectPreviousSlide(updatedStore);
      expect(prev).toBeDefined();
      expect(prev?.id).not.toBe(slide2Id);
    });

    it('selectIsMultiSlide checks active phase slide count', () => {
      const store = useTacticalUnifiedStore.getState();
      expect(selectIsMultiSlide(store)).toBe(false);

      store.addSlide();
      expect(selectIsMultiSlide(useTacticalUnifiedStore.getState())).toBe(true);
    });
  });
});
