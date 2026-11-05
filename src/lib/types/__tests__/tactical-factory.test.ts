import { describe, expect, it } from 'vitest';
import {
  createDefaultInitialPlayers,
  createDefaultPhase,
  createDefaultProject,
  createDefaultSlide,
} from '../tactical/factory';

describe('tactical factory defaults', () => {
  it('creates default project with 4:5 aspect ratio and canvas fit boundary box', () => {
    const project = createDefaultProject('test-project-id');
    expect(project.aspectRatio).toBe('4:5');
    expect(project.boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
    expect(project.phases[0].aspectRatio).toBe('4:5');
    expect(project.phases[0].boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
    expect(project.phases[0].slides[0].aspectRatio).toBe('4:5');
    expect(project.phases[0].slides[0].boundaryBox).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      enabled: true,
      visible: false,
      fitTarget: 'canvas',
    });
  });

  it('creates default phase with 4:5 aspect ratio and canvas fit boundary box', () => {
    const phase = createDefaultPhase();
    expect(phase.aspectRatio).toBe('4:5');
    expect(phase.boundaryBox?.fitTarget).toBe('canvas');
  });

  it('creates default slide with 4:5 aspect ratio and canvas fit boundary box', () => {
    const slide = createDefaultSlide(0);
    expect(slide.aspectRatio).toBe('4:5');
    expect(slide.boundaryBox?.fitTarget).toBe('canvas');
  });

  it('creates initial 22 players with Home 4-2-3-1 and Away 4-4-2', () => {
    const players = createDefaultInitialPlayers();
    expect(players).toHaveLength(22);

    const homePlayers = players.filter((p) => p.team === 'home');
    const awayPlayers = players.filter((p) => p.team === 'away');
    expect(homePlayers).toHaveLength(11);
    expect(awayPlayers).toHaveLength(11);

    // Verify home formation contains 4-2-3-1 positions
    const homePositions = homePlayers.map((p) => p.position);
    expect(homePositions).toContain('GK');
    expect(homePositions).toContain('AM');
    expect(homePositions).toContain('ST');

    // Verify away formation contains 4-4-2 positions
    const awayPositions = awayPlayers.map((p) => p.position);
    expect(awayPositions).toContain('GK');
    expect(
      awayPositions.filter((pos) => pos === 'CF' || pos === 'ST'),
    ).toHaveLength(2);
  });
});
