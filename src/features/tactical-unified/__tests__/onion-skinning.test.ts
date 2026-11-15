import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import {
  selectDomainActiveSlide,
  selectDomainPreviousSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { createDefaultTacticalProject } from '@/features/tactical-unified/stores/tactical-store-provider';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import { evaluateStaticSlideFrame } from '@/lib/tactical/engine/timeline-evaluator';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';

describe('AAWU 3-3: Drag-only Onion Skinning & Canvas Preview', () => {
  let documentStore: DocumentStore;
  let phaseId: string;
  let slide1Id: string;

  beforeEach(() => {
    const project = createDefaultTacticalProject();
    documentStore = createDocumentStore(project);
    phaseId = project.phases[0]?.id ?? 'default-phase-1';
    slide1Id = project.phases[0]?.slides[0]?.id ?? 'default-slide-1';
  });

  describe('selectDomainPreviousSlide selector', () => {
    it('returns null when there is only one slide', () => {
      const { project } = documentStore.getState();
      expect(project.phases[0]?.slides.length).toBe(1);

      const prevSlide = selectDomainPreviousSlide(project, phaseId, slide1Id);
      expect(prevSlide).toBeNull();
    });

    it('returns null when the first slide of multiple slides is active', () => {
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: 'slide-2',
      });

      const { project } = documentStore.getState();
      expect(project.phases[0]?.slides.length).toBe(2);

      const prevSlide = selectDomainPreviousSlide(project, phaseId, slide1Id);
      expect(prevSlide).toBeNull();
    });

    it('returns the previous slide when the second or later slide is active', () => {
      const slide2Id = 'slide-2';
      const slide3Id = 'slide-3';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide2Id,
        mode: 'object-free',
        newSlideId: slide3Id,
      });

      const { project } = documentStore.getState();
      expect(selectDomainPreviousSlide(project, phaseId, slide2Id)?.id).toBe(
        slide1Id,
      );
      expect(selectDomainPreviousSlide(project, phaseId, slide3Id)?.id).toBe(
        slide2Id,
      );
    });

    it('updates previous slide reference correctly when slides are reordered', () => {
      const slide2Id = 'slide-2';
      const slide3Id = 'slide-3';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide2Id,
        mode: 'object-free',
        newSlideId: slide3Id,
      });

      documentStore.getState().dispatch({
        type: 'REORDER_SLIDES',
        phaseId,
        orderedSlideIds: [slide3Id, slide1Id, slide2Id],
      });

      const { project } = documentStore.getState();
      expect(selectDomainPreviousSlide(project, phaseId, slide1Id)?.id).toBe(
        slide3Id,
      );
      expect(selectDomainPreviousSlide(project, phaseId, slide3Id)).toBeNull();
    });
  });

  describe('Player onion skinning data resolution', () => {
    it('accurately resolves previous player position for onion skin ghost rendering', () => {
      const initialSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slide1Id,
      );
      expect(initialSlide).toBeDefined();
      const testPlayer = initialSlide?.players[0];
      expect(testPlayer).toBeDefined();
      if (!testPlayer) return;

      documentStore.getState().dispatchSlide(phaseId, slide1Id, {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: testPlayer.id,
            x: toScreenNormCoord(25),
            y: toScreenNormCoord(35),
          },
        ],
      });

      const slide2Id = 'slide-2';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });

      documentStore.getState().dispatchSlide(phaseId, slide2Id, {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: testPlayer.id,
            x: toScreenNormCoord(60),
            y: toScreenNormCoord(80),
          },
        ],
      });

      const { project } = documentStore.getState();
      const prevSlide = selectDomainPreviousSlide(project, phaseId, slide2Id);
      expect(prevSlide).not.toBeNull();

      const prevPlayer = prevSlide?.players.find((p) => p.id === testPlayer.id);
      expect(prevPlayer).toBeDefined();
      expect(prevPlayer?.x).toBe(25);
      expect(prevPlayer?.y).toBe(35);

      const curSlide = selectDomainActiveSlide(project, phaseId, slide2Id);
      expect(curSlide).toBeDefined();
      const curPlayer = curSlide?.players.find((p) => p.id === testPlayer.id);
      expect(curPlayer?.x).toBe(60);
      expect(curPlayer?.y).toBe(80);

      if (curSlide) {
        const frame = evaluateStaticSlideFrame(curSlide, 1);
        const scene = compileSceneGraph(
          frame,
          null,
          { width: 800, height: 600 },
          prevSlide,
        );
        expect(scene).toBeDefined();
      }
    });

    it('does not resolve ghost when player was added only in current slide or was on bench', () => {
      const slide2Id = 'slide-2';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });

      const basePlayer = selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slide1Id,
      )?.players[0];
      expect(basePlayer).toBeDefined();
      if (!basePlayer) return;

      const newPlayerId = 'custom-striker-9';
      documentStore.getState().dispatchSlide(phaseId, slide2Id, {
        type: 'ADD_PLAYER',
        player: {
          ...basePlayer,
          id: newPlayerId,
          name: 'New Striker',
          x: toScreenNormCoord(50),
          y: toScreenNormCoord(50),
        },
      });

      const { project } = documentStore.getState();
      const prevSlide = selectDomainPreviousSlide(project, phaseId, slide2Id);
      const prevPlayer = prevSlide?.players.find((p) => p.id === newPlayerId);
      expect(prevPlayer).toBeUndefined();
    });
  });

  describe('Ball onion skinning data resolution', () => {
    it('accurately resolves previous ball position for ghost rendering', () => {
      documentStore.getState().dispatchSlide(phaseId, slide1Id, {
        type: 'UPDATE_BALL',
        patch: { x: toScreenNormCoord(30), y: toScreenNormCoord(40) },
      });

      const slide2Id = 'slide-2';
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        afterSlideId: slide1Id,
        mode: 'object-free',
        newSlideId: slide2Id,
      });

      documentStore.getState().dispatchSlide(phaseId, slide2Id, {
        type: 'UPDATE_BALL',
        patch: { x: toScreenNormCoord(75), y: toScreenNormCoord(85) },
      });

      const { project } = documentStore.getState();
      const prevSlide = selectDomainPreviousSlide(project, phaseId, slide2Id);
      expect(prevSlide?.ball.x).toBe(30);
      expect(prevSlide?.ball.y).toBe(40);

      const curSlide = selectDomainActiveSlide(project, phaseId, slide2Id);
      expect(curSlide?.ball.x).toBe(75);
      expect(curSlide?.ball.y).toBe(85);
    });
  });
});
