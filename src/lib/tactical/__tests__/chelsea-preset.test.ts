import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_SEASONS,
  CHELSEA_PRESETS_BY_SEASON,
} from '../chelsea-preset';

describe('chelsea-preset WhoScored Official IDs', () => {
  it('should not contain any legacy 345000-series IDs in any season squad', () => {
    for (const season of AVAILABLE_SEASONS) {
      const squad = CHELSEA_PRESETS_BY_SEASON[season];
      const legacyPlayers = squad.filter(
        (p) => p.playerId >= 345000 && p.playerId < 346000,
      );
      expect(
        legacyPlayers,
        `Season ${season} should have 0 players in 345000 series, but found: ${legacyPlayers.map((p) => `${p.name} (${p.playerId})`).join(', ')}`,
      ).toHaveLength(0);
    }
  });

  it('should set official WhoScored player IDs for key Chelsea players', () => {
    const expectedIds: Record<string, number> = {
      'Cole Palmer': 395692,
      'Malo Gusto': 403850,
      'Moisés Caicedo': 410175,
      'Levi Colwill': 421351,
      'Pedro Neto': 337916,
      'Wesley Fofana': 373946,
      'Roméo Lavia': 425319,
      'Robert Sánchez': 362151,
      'Reece James': 361330,
      'Marc Cucurella': 363496,
      'Enzo Fernández': 369430,
      'Nicolas Jackson': 426050,
      'Estêvão Willian': 510728,
      'Christopher Nkunku': 300945,
      'Jadon Sancho': 346300,
      'Filip Jörgensen': 404749,
      'Kendry Páez': 477772,
    };

    for (const season of AVAILABLE_SEASONS) {
      const squad = CHELSEA_PRESETS_BY_SEASON[season];
      for (const player of squad) {
        if (player.name in expectedIds) {
          expect(player.playerId).toBe(expectedIds[player.name]);
        }
      }
    }
  });

  it('should ensure all players in all seasons have valid positive IDs', () => {
    for (const season of AVAILABLE_SEASONS) {
      const squad = CHELSEA_PRESETS_BY_SEASON[season];
      expect(squad.length).toBeGreaterThan(0);
      for (const player of squad) {
        expect(player.playerId).toBeGreaterThan(0);
      }
    }
  });
});
