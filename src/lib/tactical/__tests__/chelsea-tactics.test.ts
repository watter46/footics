import { describe, expect, it } from 'vitest';
import {
  AVAILABLE_SEASONS,
  CHELSEA_PRESET_SQUAD,
  CHELSEA_PRESETS_BY_SEASON,
  DEFAULT_OPPONENT_SQUAD,
} from '../chelsea-preset';

describe('chelsea-preset', () => {
  it('contains valid Chelsea preset squad and Opponent squad for each season', () => {
    expect(CHELSEA_PRESET_SQUAD.length).toBeGreaterThan(15);
    const palmer = CHELSEA_PRESET_SQUAD.find((p) => p.name.includes('Palmer'));
    expect(palmer).toBeDefined();
    expect(palmer?.shirtNo).toBe(20);

    // 全シーズン (26-27, 25-26, 24-25) の検証
    AVAILABLE_SEASONS.forEach((season) => {
      const squad = CHELSEA_PRESETS_BY_SEASON[season];
      expect(squad.length).toBeGreaterThan(15);
      const gk = squad.find((p) => p.position === 'GK');
      expect(gk).toBeDefined();
    });

    expect(DEFAULT_OPPONENT_SQUAD.length).toBe(15);
    expect(DEFAULT_OPPONENT_SQUAD.filter((p) => p.isFirstEleven).length).toBe(
      11,
    );
  });
});
