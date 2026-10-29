import { describe, expect, it } from 'vitest';
import {
  createDefaultPhase,
  createDefaultPlayer,
  createDefaultProject,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import {
  clonePhasesShallow,
  getSlide,
  recordHistory,
  updateSlideImmer,
  updateSlideInProject,
} from '../store-helpers';

describe('store-helpers with phases', () => {
  describe('getSlide', () => {
    it('finds slide across phases', () => {
      const project = createDefaultProject('p1');
      const slide1 = createDefaultSlide(0, 's1');
      const slide2 = createDefaultSlide(0, 's2');
      project.phases = [
        { id: 'ph1', name: 'Phase 1', slides: [slide1] },
        { id: 'ph2', name: 'Phase 2', slides: [slide2] },
      ];
      project.activePhaseId = 'ph1';

      expect(getSlide(project, 's1')).toEqual(slide1);
      expect(getSlide(project, 's2')).toEqual(slide2);
      expect(getSlide(project, 'non-existent')).toBeUndefined();
    });
  });

  describe('updateSlideInProject', () => {
    it('updates slide within its phase immutably', () => {
      const project = createDefaultProject('p1');
      project.updatedAt = '2000-01-01T00:00:00.000Z';
      const slide1 = createDefaultSlide(0, 's1');
      const slide2 = createDefaultSlide(0, 's2');
      project.phases = [
        { id: 'ph1', name: 'Phase 1', slides: [slide1] },
        { id: 'ph2', name: 'Phase 2', slides: [slide2] },
      ];

      const updated = updateSlideInProject(project, 's2', (sl) => ({
        ...sl,
        label: 'Updated Label',
      }));

      expect(updated).not.toBe(project);
      expect(updated.phases[1].slides[0].label).toBe('Updated Label');
      expect(project.phases[1].slides[0].label).not.toBe('Updated Label');
      expect(updated.updatedAt).not.toBe(project.updatedAt);
    });

    it('returns original project if slideId is not found', () => {
      const project = createDefaultProject('p1');
      const updated = updateSlideInProject(project, 'non-existent', (sl) => sl);
      expect(updated).toBe(project);
    });
  });

  describe('updateSlideImmer', () => {
    it('updates a slide immutably using Immer recipe', () => {
      const project = createDefaultProject('p1');
      project.updatedAt = '2000-01-01T00:00:00.000Z';
      const slide = createDefaultSlide(0, 's1');
      project.phases = [createDefaultPhase('ph1', 'Phase 1')];
      project.phases[0].slides = [slide];

      const updated = updateSlideImmer(project, 's1', (draft) => {
        draft.arrows.push({
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          color: '#ff0000',
          strokeWidth: 2,
          dashArray: [],
          arrowHead: true,
        });
        draft.players.push(createDefaultPlayer('home', 50, 50, '#ff0000'));
      });

      expect(updated).not.toBe(project);
      expect(updated.phases[0].slides[0].arrows).toHaveLength(1);
      expect(updated.phases[0].slides[0].players.length).toBeGreaterThan(
        project.phases[0].slides[0].players.length,
      );
      expect(project.phases[0].slides[0].arrows).toHaveLength(0);
      expect(updated.updatedAt).not.toBe(project.updatedAt);
    });

    it('does nothing if slideId is not found', () => {
      const project = createDefaultProject('p1');
      const slide = createDefaultSlide(0, 's1');
      project.phases = [createDefaultPhase('ph1', 'Phase 1')];
      project.phases[0].slides = [slide];

      const updated = updateSlideImmer(project, 'non-existent', (draft) => {
        draft.arrows.push({
          id: 'arrow-1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            { x: 10, y: 10 },
            { x: 20, y: 20 },
          ],
          color: '#ff0000',
          strokeWidth: 2,
          dashArray: [],
          arrowHead: true,
        });
      });

      expect(updated.phases[0].slides[0].arrows).toHaveLength(0);
    });
  });

  describe('recordHistory & clonePhasesShallow', () => {
    it('snapshots phases correctly', () => {
      const project = createDefaultProject('p1');
      const state = {
        project,
        past: [],
      };

      const history = recordHistory(state);
      expect(history.past).toHaveLength(1);
      expect(history.past[0]).toEqual(clonePhasesShallow(project.phases));
      expect(history.future).toEqual([]);
    });
  });
});
