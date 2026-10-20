import { describe, expect, it } from 'vitest';
import {
  createDefaultPlayer,
  createDefaultProject,
  createDefaultSlide,
} from '@/lib/types/tactical-unified';
import { updateSlideImmer } from '../store-helpers';

describe('updateSlideImmer', () => {
  it('updates a slide immutably using Immer recipe', () => {
    const project = createDefaultProject('p1');
    const slide = createDefaultSlide(0, 's1');
    project.slides = [slide];

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
    expect(updated.slides[0].arrows).toHaveLength(1);
    expect(updated.slides[0].players.length).toBeGreaterThan(
      project.slides[0].players.length,
    );
    expect(project.slides[0].arrows).toHaveLength(0);
    expect(updated.updatedAt).not.toBe(project.updatedAt);
  });

  it('does nothing if slideId is not found', () => {
    const project = createDefaultProject('p1');
    const slide = createDefaultSlide(0, 's1');
    project.slides = [slide];

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

    expect(updated.slides[0].arrows).toHaveLength(0);
  });
});
