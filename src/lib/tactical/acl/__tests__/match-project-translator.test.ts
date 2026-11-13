import { describe, expect, it } from 'vitest';
import { DomainTacticalProjectSchema } from '@/lib/types/tactical/domain-hierarchy';
import type { Match } from '@/types';
import { buildMatchToDomainProject } from '../match-project-translator';

function createSampleMatch(): Match {
  return {
    id: 999,
    homeTeam: { id: 1, name: 'Arsenal', shortName: 'ARS' },
    awayTeam: { id: 2, name: 'Chelsea', shortName: 'CHE' },
    teams: {
      home: {
        name: 'Arsenal',
        formations: [
          {
            formationName: '4-3-3',
            startMinuteExpanded: 0,
            endMinuteExpanded: 90,
            formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            playerIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
          },
        ],
        players: Array.from({ length: 12 }, (_, i) => ({
          playerId: i + 1,
          name: `Home ${i + 1}`,
          shirtNo: i + 1,
          position: i === 0 ? 'GK' : i === 11 ? 'FW' : 'MC',
          isFirstEleven: i < 11,
        })),
      },
      away: {
        name: 'Chelsea',
        formations: [
          {
            formationName: '4-2-3-1',
            startMinuteExpanded: 0,
            endMinuteExpanded: 90,
            formationSlots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            playerIds: [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
          },
        ],
        players: Array.from({ length: 12 }, (_, i) => ({
          playerId: 21 + i,
          name: `Away ${i + 1}`,
          shirtNo: i + 1,
          position: i === 0 ? 'GK' : 'MC',
          isFirstEleven: i < 11,
        })),
      },
    },
  } as unknown as Match;
}

describe('buildMatchToDomainProject', () => {
  it('translates match formations and bench squad into a DomainTacticalProjectSchema-valid bundle', () => {
    const match = createSampleMatch();
    const bundle = buildMatchToDomainProject(match, {
      minute: 15,
      projectId: 'proj-m999',
      phaseId: 'ph-1',
      slideId: 'sl-1',
      now: '2026-01-01T00:00:00.000Z',
    });

    expect(bundle.activePhaseId).toBe('ph-1');
    expect(bundle.activeSlideId).toBe('sl-1');
    expect(bundle.project.matchId).toBe('999');
    expect(bundle.project.title).toBe("Arsenal vs Chelsea (15')");
    expect(bundle.project.matchFormations).toEqual({
      home: '4-3-3',
      away: '4-2-3-1',
    });

    const players = bundle.project.phases[0].slides[0].players;
    expect(players).toHaveLength(24);
    expect(players.filter((p) => p.area === 'pitch')).toHaveLength(22);
    expect(players.filter((p) => p.area === 'bench')).toHaveLength(2);
    expect(() =>
      DomainTacticalProjectSchema.parse(bundle.project),
    ).not.toThrow();
  });
});
