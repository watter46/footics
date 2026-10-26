'use client';

import { useCallback, useState } from 'react';
import type { FilterState, OutcomeFilter } from '@/types';

export function useDashboardFilters() {
  const [filters, setFilters] = useState<FilterState>({
    selectedTeam: 'all',
    selectedPlayers: new Set(),
    outcomeFilter: 'all',
    activeStrategies: new Set(),
    activeStrategyParams: {},
    timelineSource: 'custom',
  });

  const handleTeamChange = useCallback((teamId: string) => {
    setFilters((prev) => ({
      ...prev,
      selectedTeam: teamId,
      selectedPlayers: new Set(),
    }));
  }, []);

  const handlePlayerToggle = useCallback((playerId: number) => {
    setFilters((prev) => {
      const next = new Set(prev.selectedPlayers);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return { ...prev, selectedPlayers: next };
    });
  }, []);

  const handlePlayersClear = useCallback(() => {
    setFilters((prev) => ({ ...prev, selectedPlayers: new Set() }));
  }, []);

  const handleOutcomeChange = useCallback((outcome: OutcomeFilter) => {
    setFilters((prev) => ({ ...prev, outcomeFilter: outcome }));
  }, []);

  const handleStrategyToggle = useCallback((strategyId: string) => {
    setFilters((prev) => {
      const next = new Set(prev.activeStrategies);
      if (next.has(strategyId)) next.delete(strategyId);
      else next.add(strategyId);
      return { ...prev, activeStrategies: next };
    });
  }, []);

  const handleStrategyParamChange = useCallback(
    (strategyId: string, paramId: string, value: unknown) => {
      setFilters((prev) => ({
        ...prev,
        activeStrategyParams: {
          ...prev.activeStrategyParams,
          [strategyId]: {
            ...prev.activeStrategyParams[strategyId],
            [paramId]: value,
          },
        },
      }));
    },
    [],
  );

  const handleTimelineSourceChange = useCallback(
    (source: 'all' | 'whoscored' | 'custom') => {
      setFilters((prev) => ({ ...prev, timelineSource: source }));
    },
    [],
  );

  return {
    filters,
    handleTeamChange,
    handlePlayerToggle,
    handlePlayersClear,
    handleOutcomeChange,
    handleStrategyToggle,
    handleStrategyParamChange,
    handleTimelineSourceChange,
  };
}
