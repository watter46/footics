'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { deleteCustomEvent, getCustomEventsByMatch } from '@/lib/db';
import type {
  FormattedMatchData,
  FormattedPlayer,
  NationalPlayerArray,
} from '@/lib/national-match-schema';
import { NationalMatchRawDataSchema } from '@/lib/national-match-schema';
import { customEventKeys, nationalMatchKeys } from '@/lib/query-keys';
import { filterEvents } from '@/services/event-filter';
import type { CustomEventRow, EventRow, Match, SimplifiedTeam } from '@/types';
import { useDashboardFilters } from '../dashboard/use-dashboard-filters';

interface UseNationalDashboardProps {
  matchId: string;
  defaultHome: string;
  defaultAway: string;
  defaultScore: string;
}

export function useNationalDashboard({
  matchId,
  defaultHome,
  defaultAway,
  defaultScore,
}: UseNationalDashboardProps) {
  const queryClient = useQueryClient();

  const {
    filters,
    handleTeamChange,
    handlePlayerToggle,
    handlePlayersClear,
    handleOutcomeChange,
    handleStrategyToggle,
    handleStrategyParamChange,
    handleTimelineSourceChange,
  } = useDashboardFilters();

  // カスタムイベントの取得
  const { data: customEvents = [] } = useQuery({
    queryKey: customEventKeys.byMatch(matchId),
    queryFn: () => getCustomEventsByMatch(matchId),
  });

  // ナショナルマッチデータの取得
  const { data: matchData = null } = useQuery({
    queryKey: nationalMatchKeys.detail(matchId),
    queryFn: async () => {
      const jsonPath = `/national_data/match_${matchId}.json`;
      const res = await fetch(jsonPath);
      if (!res.ok) {
        throw new Error(
          `HTTP error! status: ${res.status} (Check if ${jsonPath} exists in public folder)`,
        );
      }
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        throw new TypeError(
          'Received non-JSON response from server. (Possible 404 redirect)',
        );
      }
      const data = await res.json();

      // Zod によるバリデーション
      const parsed = NationalMatchRawDataSchema.parse(data);
      const d = parsed.initialMatchDataForScrappers[0];
      const lineups = d[2];

      const formatted: FormattedMatchData = {
        lineups: {
          homeStarters: (lineups[9] || []).map(
            (p: NationalPlayerArray): FormattedPlayer => ({
              name: p[0],
              playerId: p[3],
              isFirstEleven: true,
            }),
          ),
          awayStarters: (lineups[10] || []).map(
            (p: NationalPlayerArray): FormattedPlayer => ({
              name: p[0],
              playerId: p[3],
              isFirstEleven: true,
            }),
          ),
          homeBench: (lineups[11] || []).map(
            (p: NationalPlayerArray): FormattedPlayer => ({
              name: p[0],
              playerId: p[3],
              isFirstEleven: false,
            }),
          ),
          awayBench: (lineups[12] || []).map(
            (p: NationalPlayerArray): FormattedPlayer => ({
              name: p[0],
              playerId: p[3],
              isFirstEleven: false,
            }),
          ),
        },
        timeline: d[1],
      };
      return formatted;
    },
  });

  const invalidateCustomEvents = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: customEventKeys.byMatch(matchId),
    });
  }, [matchId, queryClient]);

  const handleEditCustomEvent = useCallback(
    (event: CustomEventRow | EventRow) => {
      let labels: string[] = [];
      if ('labels' in event) {
        labels = event.labels;
      } else if (event.custom_label) {
        labels = event.custom_label
          .split(' / ')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: {
            action: 'TOGGLE_EVENT_MEMO',
            matchId,
            id: event.id.toString(),
            minute: Number(event.minute),
            second: Number(event.second),
            labels,
            memo: ('memo' in event ? event.memo : event.custom_memo) || '',
          },
        }),
      );
    },
    [matchId],
  );

  const handleDeleteCustomEvent = useCallback(
    async (eventId: string) => {
      if (!confirm('Are you sure you want to delete this event?')) return;
      await deleteCustomEvent(eventId);
      invalidateCustomEvents();
    },
    [invalidateCustomEvents],
  );

  const events: EventRow[] = useMemo(() => {
    const allMemos = customEvents.map(
      (e) =>
        ({
          ...e,
          source: 'custom',
          custom_label: Array.isArray(e.labels) ? e.labels.join(' / ') : '',
          custom_memo: e.memo,
          period: 1,
          expanded_minute: e.minute,
          team_id: 0,
          type_name: 'Memo',
          outcome: true,
          // EventRow の必須プロパティを補完
          event_id: 0,
          player_id: null,
          x: 0,
          y: 0,
          end_x: null,
          end_y: null,
          type_value: 0,
          is_touch: false,
          qualifiers: [],
        }) as EventRow,
    );

    // フィルタリングの適用
    const filtered = filterEvents(allMemos, filters);

    return filtered.sort((a, b) => {
      if (a.minute !== b.minute) return a.minute - b.minute;
      return a.second - b.second;
    });
  }, [customEvents, filters]);

  const metadata: Match = useMemo(
    () => ({
      id: matchId,
      date: '',
      score: defaultScore || 'vs',
      matchType: 'national',
      playerIdNameDictionary: {},
      homeTeam: { id: 0, name: defaultHome || 'Home' },
      awayTeam: { id: 1, name: defaultAway || 'Away' },
      teams: {
        home: {
          teamId: 0,
          name: defaultHome || 'Home',
          players: matchData
            ? [
                ...matchData.lineups.homeStarters,
                ...matchData.lineups.homeBench,
              ]
            : [],
        } satisfies SimplifiedTeam,
        away: {
          teamId: 1,
          name: defaultAway || 'Away',
          players: matchData
            ? [
                ...matchData.lineups.awayStarters,
                ...matchData.lineups.awayBench,
              ]
            : [],
        } satisfies SimplifiedTeam,
      },
    }),
    [matchId, defaultHome, defaultAway, defaultScore, matchData],
  );

  return useMemo(
    () => ({
      events,
      metadata,
      filters,
      invalidateCustomEvents,
      handleEditCustomEvent,
      handleDeleteCustomEvent,
      handleTeamChange,
      handlePlayerToggle,
      handlePlayersClear,
      handleOutcomeChange,
      handleStrategyToggle,
      handleStrategyParamChange,
      handleTimelineSourceChange,
    }),
    [
      events,
      metadata,
      filters,
      invalidateCustomEvents,
      handleEditCustomEvent,
      handleDeleteCustomEvent,
      handleTeamChange,
      handlePlayerToggle,
      handlePlayersClear,
      handleOutcomeChange,
      handleStrategyToggle,
      handleStrategyParamChange,
      handleTimelineSourceChange,
    ],
  );
}
