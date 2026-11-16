import { describe, expect, it } from 'vitest';
import { DomainTacticalProjectSchema } from '../tactical/domain-hierarchy';
import {
  createDefaultInitialPlayers,
  createDefaultPhase,
  createDefaultProject,
  createDefaultSlide,
} from '../tactical/factory';

describe('tactical factory defaults', () => {
  it('creates default project with 4:5 aspect ratio, canvas fit boundary box, and valid DomainTacticalProjectSchema', () => {
    const project = createDefaultProject('test-project-id');
    expect(project.version).toBe('3.0.0');
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
    expect(DomainTacticalProjectSchema.safeParse(project).success).toBe(true);
  });

  it('creates default phase with 4:5 aspect ratio and canvas fit boundary box', () => {
    const phase = createDefaultPhase();
    expect(phase.aspectRatio).toBe('4:5');
    expect(phase.boundaryBox?.fitTarget).toBe('canvas');
  });

  it('creates default slide with 22 players and ball at center', () => {
    const slide = createDefaultSlide(0);
    expect(slide.index).toBe(0);
    expect(slide.players).toHaveLength(22);
    expect(slide.ball).toEqual({ x: 50, y: 50, visible: true });
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
