import { describe, expect, it } from 'vitest';
import {
  matchSlidePlayers,
  type PlayerMatchCandidate,
} from '../engine/player-matching';

describe('matchSlidePlayers', () => {
  it('case 1: matches players with identical id', () => {
    const pA: PlayerMatchCandidate = {
      id: 'p1',
      team: 'home',
      shirtNo: '7',
      name: 'Saka',
    };
    const pB: PlayerMatchCandidate = {
      id: 'p1',
      team: 'home',
      shirtNo: '7',
      name: 'Saka',
    };

    const result = matchSlidePlayers([pA], [pB]);

    expect(result).toEqual([{ key: 'p1', playerA: pA, playerB: pB }]);
  });

  it('case 2: matches players with different id by same team and trimmed shirtNo', () => {
    const pA: PlayerMatchCandidate = {
      id: 'a1',
      team: 'home',
      shirtNo: ' 10 ',
    };
    const pB: PlayerMatchCandidate = {
      id: 'b1',
      team: 'home',
      shirtNo: '10',
    };

    const result = matchSlidePlayers([pA], [pB]);

    expect(result).toEqual([{ key: 'a1', playerA: pA, playerB: pB }]);
  });

  it('case 3: matches players by same team and case-insensitive name, but not across different teams', () => {
    const homeA: PlayerMatchCandidate = {
      id: 'a1',
      team: 'home',
      name: 'Saka',
    };
    const awayA: PlayerMatchCandidate = {
      id: 'a2',
      team: 'away',
      name: 'Rice',
    };
    const homeB: PlayerMatchCandidate = {
      id: 'b1',
      team: 'home',
      name: 'saka',
    };
    const homeSameNameB: PlayerMatchCandidate = {
      id: 'b2',
      team: 'home',
      name: 'Rice',
    };

    const result = matchSlidePlayers([homeA, awayA], [homeB, homeSameNameB]);

    expect(result).toEqual([
      { key: 'a1', playerA: homeA, playerB: homeB },
      { key: 'a2', playerA: awayA },
      { key: 'b2', playerB: homeSameNameB },
    ]);
  });

  it('case 4: returns unmatched players in A with playerB undefined and unmatched players in B with playerA undefined', () => {
    const onlyA: PlayerMatchCandidate = { id: 'a1', team: 'home' };
    const onlyB: PlayerMatchCandidate = { id: 'b1', team: 'away' };

    const result = matchSlidePlayers([onlyA], [onlyB]);

    expect(result).toEqual([
      { key: 'a1', playerA: onlyA },
      { key: 'b1', playerB: onlyB },
    ]);
  });

  it('case 5: returns referentially identical array on repeated call with same array instances', () => {
    const playersA: PlayerMatchCandidate[] = [{ id: 'p1', team: 'home' }];
    const playersB: PlayerMatchCandidate[] = [{ id: 'p1', team: 'home' }];

    const first = matchSlidePlayers(playersA, playersB);
    const second = matchSlidePlayers(playersA, playersB);

    expect(second).toBe(first);
  });
});
