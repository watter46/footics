import { eventStrategies } from '@/registry';
import type { EventStrategy } from '@/registry/event-strategy';
import type { EventRow, FilterState } from '@/types';

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

  return events.filter((event) => {
    // 0. Team Filtering
    if (selectedTeam !== 'all') {
      if (event.team_id.toString() !== selectedTeam) {
        return false;
      }
    }

    // 1. Source Filtering
    if (timelineSource !== 'all') {
      const isCustomSource = event.source === 'custom';
      if (timelineSource === 'whoscored' && isCustomSource) return false;
      if (timelineSource === 'custom' && !isCustomSource) return false;
    }

    // Custom events also should be filtered by common filters like Team/Player/Outcome
    // if the user expects consistent behavior.
    // In current implementation, custom events have player_id = null and team_id = 0.

    // 2. Outcome Filtering
    if (outcomeFilter === 'success' && event.outcome !== true) return false;
    if (outcomeFilter === 'fail' && event.outcome !== false) return false;

    // 3. Player Filtering
    if (selectedPlayers.size > 0) {
      if (event.player_id === null || !selectedPlayers.has(event.player_id)) {
        return false;
      }
    }

    // 4. Strategy Filtering
    // If multiple strategies are active, the event must satisfy ALL of them (AND condition)
    // Or we could do OR condition depending on original logic.
    // Original `query-builder.ts` used `AND`.
    if (strategies.length > 0) {
      const satisfiesAny = strategies.some((strategy) => {
        const params = activeStrategyParams[strategy.id] || {};
        return strategy.predicate(event, params);
      });
      if (!satisfiesAny) return false;
    }

    return true;
  });
}
