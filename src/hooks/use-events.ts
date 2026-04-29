'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getCustomEventsByMatch, getEventsByMatch } from '@/lib/db';
import { eventKeys } from '@/lib/query-keys';
import { filterEvents } from '@/services/event-filter';
import type { EventRow, FilterState } from '@/types';

interface UseEventsResult {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
}

export function useEvents(
  matchId: string,
  filters: FilterState,
): UseEventsResult {
  const { data, isPlaceholderData, isLoading } = useQuery({
    queryKey: [...eventKeys.filtered(filters), matchId],
    queryFn: async () => {
      if (!matchId) return { events: [], totalCount: 0 };

      // Dexie から生データを取得
      const rawEvents = await getEventsByMatch(matchId);

      // カスタムイベントの統合
      const customEvents = await getCustomEventsByMatch(matchId);
      const customEventRows: EventRow[] = customEvents.map((c) => ({
        id: c.id,
        match_id: c.match_id,
        event_id: -1,
        team_id: 0,
        player_id: null,
        period: c.period || 1,
        minute: c.minute,
        second: c.second,
        expanded_minute: c.minute,
        x: 0,
        y: 0,
        end_x: null,
        end_y: null,
        type_value: -1,
        type_name: 'Custom',
        outcome: true,
        is_touch: false,
        is_shot: false,
        is_goal: false,
        qualifiers: [],
        source: 'custom',
        custom_label: Array.isArray(c.labels) ? c.labels.join(' / ') : c.labels,
        custom_memo: c.memo,
      }));

      const allEvents = [...rawEvents, ...customEventRows].sort((a, b) => {
        if (a.period !== b.period) return a.period - b.period;
        if (a.minute !== b.minute) return a.minute - b.minute;
        return a.second - b.second;
      });

      // オンメモリフィルタリングの実行
      const filteredEvents = filterEvents(allEvents, filters);

      return {
        events: filteredEvents,
        totalCount: filteredEvents.length,
      };
    },
    enabled: !!matchId,
    placeholderData: keepPreviousData,
  });

  return {
    events: data?.events ?? [],
    totalCount: data?.totalCount ?? 0,
    isQuerying: isLoading || isPlaceholderData,
  };
}
