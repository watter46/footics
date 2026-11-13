import { describe, expect, it } from 'vitest';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_PITCH_APPEARANCE,
  DEFAULT_SCREEN_BACKGROUND,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical/slide';
import { createDefaultDomainPlayers } from '../domain/default-players';
import { applyTacticalCommand } from '../domain/project-reducer';

function createSampleProject(): DomainTacticalProject {
  const players = createDefaultDomainPlayers('#034694', '#ef4444', '16:9').map(
    (p, idx) => ({
      ...p,
      id: `pl-${p.team}-${idx}`,
      name: `Player ${idx}`,
      shirtNo: `${idx + 1}`,
      x: clampToScreenNorm(12),
      y: clampToScreenNorm(14),
      trajectory: { type: 'straight' as const },
    }),
  );
  return {
    id: 'proj-modes',
    version: '3.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    homeColor: { primary: '#034694' },
    awayColor: { primary: '#ef4444' },
    pitchAppearance: { ...DEFAULT_PITCH_APPEARANCE },
    screenBackground: { ...DEFAULT_SCREEN_BACKGROUND },
    matchId: 'm-1',
    matchFormations: { home: '4-3-3', away: '4-2-3-1' },
    tags: [],
    phases: [
      {
        id: 'ph-1',
        name: 'Phase 1',
        aspectRatio: '16:9',
        boundaryBox: { ...DEFAULT_BOUNDARY_BOX_16_9, x: 5, width: 80 },
        backgroundType: 'pitch',
        slides: [
          {
            id: 'sl-1',
            index: 0,
            label: 'Intro',
            players,
            arrows: [
              {
                id: 'locked-arr',
                annotationType: 'arrow',
                arrowType: 'pass',
                curveType: 'straight',
                points: [toScreenNormPoint(20, 20), toScreenNormPoint(40, 40)],
                color: '#ffffff',
                strokeWidth: 3,
                dashArray: [],
                startMarker: 'none',
                endMarker: 'arrow',
                locked: true,
              },
            ],
            zones: [],
            texts: [],
            ball: {
              x: clampToScreenNorm(75),
              y: clampToScreenNorm(25),
              visible: true,
              trajectory: { type: 'straight' },
            },
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
          },
        ],
      },
    ],
  };
}

describe('slide modes, phase match-init, and keep-squad reset', () => {
  it('ADD_SLIDE supports full (deep clone + trajectory clear), object-free, and blank (22 defaults)', () => {
    const p0 = createSampleProject();
    const pFull = applyTacticalCommand(p0, {
      type: 'ADD_SLIDE',
      phaseId: 'ph-1',
      afterSlideId: 'sl-1',
      mode: 'full',
      newSlideId: 'sl-full',
    });
    const fullSlide = pFull.phases[0].slides[1];
    expect(fullSlide.id).toBe('sl-full');
    expect(fullSlide.label).toBe('Intro (copy)');
    expect(fullSlide.arrows).toHaveLength(1);
    expect(fullSlide.arrows).not.toBe(p0.phases[0].slides[0].arrows);
    expect(fullSlide.ball.trajectory).toBeUndefined();

    const pBlank = applyTacticalCommand(pFull, {
      type: 'ADD_SLIDE',
      phaseId: 'ph-1',
      mode: 'blank',
      newSlideId: 'sl-blank',
    });
    const blankSlide = pBlank.phases[0].slides[2];
    expect(blankSlide.id).toBe('sl-blank');
    expect(blankSlide.players).toHaveLength(22);
    expect(blankSlide.arrows).toHaveLength(0);
  });

  it('ADD_PHASE applies kickoff formation coords and RESET_SLIDE_KEEP_SQUAD resets positions & boundaryBox', () => {
    const p0 = createSampleProject();
    const pWithPhase = applyTacticalCommand(p0, {
      type: 'ADD_PHASE',
      name: 'Phase 2',
      newPhaseId: 'ph-2',
      newSlideId: 'sl-2-1',
    });
    const newSlide = pWithPhase.phases[1].slides[0];
    const homePlayers = newSlide.players.filter((pl) => pl.team === 'home');
    const home433 = FORMATION_POSITIONS['4-3-3'];
    homePlayers.forEach((pl, idx) => {
      const def = home433[idx % home433.length];
      const raw = getFormationActualPos(def, 'home', 'full');
      expect(pl.x).toBeCloseTo(def.position === 'GK' ? 7 : raw.x, 1);
    });

    const pReset = applyTacticalCommand(p0, {
      type: 'RESET_SLIDE_KEEP_SQUAD',
      phaseId: 'ph-1',
      slideId: 'sl-1',
    });
    expect(pReset.phases[0].boundaryBox).toEqual(
      getDefaultBoundaryBoxForAspect('16:9'),
    );
    expect(pReset.phases[0].slides[0].arrows).toHaveLength(0);
    expect(pReset.phases[0].slides[0].ball.x).toBe(50);
    expect(pReset.phases[0].slides[0].ball.trajectory).toBeUndefined();
  });
});
