'use client';

import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { eventKeys } from '@/lib/query-keys';
import { buildCountQuery, buildQuery } from '@/services/query-builder';
import type { EventRow, FilterState } from '@/types';

interface UseEventsResult {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
}

export function useEvents(
  connection: AsyncDuckDBConnection | null,
  filters: FilterState,
): UseEventsResult {
  const { data, isPlaceholderData, isLoading } = useQuery({
    queryKey: eventKeys.filtered(filters),
    queryFn: async () => {
      if (!connection) throw new Error('No connection');

      // Count query
      const countSql = buildCountQuery(filters);
      const countResult = await connection.query(countSql);
      const countRows = countResult.toArray().map((r) => r.toJSON());
      const totalCount = countRows.length > 0 ? Number(countRows[0].total) : 0;

      // Data query
      const dataSql = buildQuery(filters);
      const dataResult = await connection.query(dataSql);
      const events = dataResult
        .toArray()
        .map((row) => row.toJSON()) as EventRow[];

      return { events, totalCount };
    },
    enabled: !!connection,
    placeholderData: keepPreviousData,
  });

  return {
    events: data?.events ?? [],
    totalCount: data?.totalCount ?? 0,
    // data があっても次の条件での取得中なら querying として扱う (または isLoading)
    isQuerying: isLoading || isPlaceholderData,
  };
}
