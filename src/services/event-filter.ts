import { eventStrategies } from '@/registry';
import type { EventStrategy } from '@/registry/event-strategy';
import type { EventRow, FilterState } from '@/types';

const isTeamMatch = (event: EventRow, selectedTeam: string): boolean =>
  selectedTeam === 'all' || event.team_id.toString() === selectedTeam;

const isSourceMatch = (event: EventRow, timelineSource: string): boolean => {
  if (timelineSource === 'all') return true;
  return event.source === timelineSource;
};

const isOutcomeMatch = (event: EventRow, outcomeFilter: string): boolean => {
  if (outcomeFilter === 'success') return event.outcome === true;
  if (outcomeFilter === 'fail') return event.outcome === false;
  return true;
};

const isPlayerMatch = (event: EventRow, selectedPlayers: Set<number>): boolean => {
  if (selectedPlayers.size === 0) return true;
  return event.player_id !== null && selectedPlayers.has(event.player_id);
};

const isStrategyMatch = (
  event: EventRow,
  strategies: EventStrategy[],
  activeStrategyParams: Record<string, any>
): boolean => {
  if (strategies.length === 0) return true;
  return strategies.some((strategy) => {
    const params = activeStrategyParams[strategy.id] || {};
    return strategy.predicate(event, params);
  });
};

/**
 * Executes on-memory JS filtering using the given FilterState on an array of EventRow.
 *
 * Includes:
 * - Match scope (built-in if event array is already scoped to match)
 * - Source (whoscored v.s. custom)
 * - Outcome (all, success, fail)
 * - Players (selectedPlayers)
 * - Event Strategies (activeStrategies with params)
 */
export function filterEvents(
  events: EventRow[],
  filterState: FilterState,
): EventRow[] {
  const {
    selectedTeam,
    timelineSource,
    outcomeFilter,
    selectedPlayers,
    activeStrategies,
    activeStrategyParams,
  } = filterState;

  const strategies = Array.from(activeStrategies)
    .map((id: string) => eventStrategies.find((s) => s.id === id))
    .filter((s): s is EventStrategy => s !== undefined);

  return events.filter(
    (event) =>
      isTeamMatch(event, selectedTeam) &&
      isSourceMatch(event, timelineSource) &&
      isOutcomeMatch(event, outcomeFilter) &&
      isPlayerMatch(event, selectedPlayers) &&
      isStrategyMatch(event, strategies, activeStrategyParams)
  );
}
