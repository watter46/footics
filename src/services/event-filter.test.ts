import { describe, it, expect, vi } from 'vitest';
import { filterEvents } from './event-filter';
import type { EventRow, FilterState } from '@/types';

vi.mock('@/registry', () => ({
  eventStrategies: [
    {
      id: 'test-strategy',
      predicate: (event: any, params: any) => event.type_name === params.expectedType,
    },
  ],
}));

describe('filterEvents', () => {
  const createEvent = (overrides: Partial<EventRow>): EventRow => ({
    id: '1',
    match_id: 'm1',
    event_id: 1,
    team_id: 1,
    player_id: 10,
    period: 1,
    minute: 10,
    second: 0,
    expanded_minute: 10,
    x: 50,
    y: 50,
    end_x: null,
    end_y: null,
    type_value: 1,
    type_name: 'Pass',
    outcome: true,
    is_touch: true,
    qualifiers: [],
    source: 'whoscored',
    ...overrides,
  } as EventRow);

  const createFilterState = (overrides: Partial<FilterState>): FilterState => ({
    selectedTeam: 'all',
    timelineSource: 'all',
    outcomeFilter: 'all',
    selectedPlayers: new Set(),
    activeStrategies: new Set(),
    activeStrategyParams: {},
    ...overrides,
  } as FilterState);

  it('returns all events when no filters are applied', () => {
    const events = [createEvent({ id: '1' }), createEvent({ id: '2' })];
    const state = createFilterState({});
    const result = filterEvents(events, state);
    expect(result).toHaveLength(2);
  });

  it('filters by team', () => {
    const events = [
      createEvent({ team_id: 1 }),
      createEvent({ team_id: 2 }),
    ];
    const state = createFilterState({ selectedTeam: '1' });
    const result = filterEvents(events, state);
    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe(1);
  });

  it('filters by source (whoscored vs custom)', () => {
    const events = [
      createEvent({ source: 'whoscored' }),
      createEvent({ source: 'custom' }),
    ];
    const whoscoredState = createFilterState({ timelineSource: 'whoscored' });
    expect(filterEvents(events, whoscoredState)).toHaveLength(1);
    expect(filterEvents(events, whoscoredState)[0].source).toBe('whoscored');

    const customState = createFilterState({ timelineSource: 'custom' });
    expect(filterEvents(events, customState)).toHaveLength(1);
    expect(filterEvents(events, customState)[0].source).toBe('custom');
  });

  it('filters by outcome (success vs fail)', () => {
    const events = [
      createEvent({ outcome: true }),
      createEvent({ outcome: false }),
    ];
    const successState = createFilterState({ outcomeFilter: 'success' });
    expect(filterEvents(events, successState)).toHaveLength(1);
    expect(filterEvents(events, successState)[0].outcome).toBe(true);

    const failState = createFilterState({ outcomeFilter: 'fail' });
    expect(filterEvents(events, failState)).toHaveLength(1);
    expect(filterEvents(events, failState)[0].outcome).toBe(false);
  });

  it('filters by selected players', () => {
    const events = [
      createEvent({ player_id: 10 }),
      createEvent({ player_id: 20 }),
      createEvent({ player_id: null }),
    ];
    const state = createFilterState({ selectedPlayers: new Set([10, 30]) });
    const result = filterEvents(events, state);
    expect(result).toHaveLength(1);
    expect(result[0].player_id).toBe(10);
  });

  it('filters by active strategies', () => {
    const events = [
      createEvent({ type_name: 'Pass' }),
      createEvent({ type_name: 'Shot' }),
    ];
    const state = createFilterState({
      activeStrategies: new Set(['test-strategy']),
      activeStrategyParams: {
        'test-strategy': { expectedType: 'Shot' }
      }
    });
    const result = filterEvents(events, state);
    expect(result).toHaveLength(1);
    expect(result[0].type_name).toBe('Shot');
  });

  it('combines multiple filters', () => {
    const events = [
      createEvent({ team_id: 1, outcome: true, source: 'whoscored' }),
      createEvent({ team_id: 1, outcome: false, source: 'whoscored' }),
      createEvent({ team_id: 2, outcome: true, source: 'whoscored' }),
    ];
    const state = createFilterState({
      selectedTeam: '1',
      outcomeFilter: 'success',
    });
    const result = filterEvents(events, state);
    expect(result).toHaveLength(1);
    expect(result[0].team_id).toBe(1);
    expect(result[0].outcome).toBe(true);
  });
});
