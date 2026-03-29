"use client";

/**
 * useEvents — フィルタ条件に基づいて DuckDB からイベントを取得する Hook
 *
 * 設計:
 * - フィルタ変更を検知して自動再クエリ。
 * - useRef で「最新のクエリID」を管理し、古いクエリの結果を破棄（Race Condition 防止）。
 * - 150ms debounce でパラメータ連続変更時のクエリ乱発を抑制。
 */
import { useEffect, useRef, useState, useCallback } from "react";
import type { AsyncDuckDBConnection } from "@duckdb/duckdb-wasm";
import type { EventRow, FilterState } from "@/types";
import { buildQuery, buildCountQuery } from "@/services/query-builder";

interface UseEventsResult {
  events: EventRow[];
  totalCount: number;
  isQuerying: boolean;
}

const DEBOUNCE_MS = 150;

export function useEvents(
  connection: AsyncDuckDBConnection | null,
  filters: FilterState
): UseEventsResult {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isQuerying, setIsQuerying] = useState(false);

  // Race condition 防止用のクエリ ID
  const queryIdRef = useRef(0);

  const executeQuery = useCallback(async () => {
    if (!connection) return;

    const currentQueryId = ++queryIdRef.current;
    setIsQuerying(true);

    try {
      // Count query
      const countSql = buildCountQuery(filters);
      const countResult = await connection.query(countSql);

      // Race check
      if (currentQueryId !== queryIdRef.current) return;

      const countRows = countResult.toArray().map((r) => r.toJSON());
      const total = countRows.length > 0 ? Number(countRows[0].total) : 0;
      setTotalCount(total);

      // Data query
      const dataSql = buildQuery(filters);
      const dataResult = await connection.query(dataSql);

      // Race check
      if (currentQueryId !== queryIdRef.current) return;

      const rows = dataResult.toArray().map((row) => row.toJSON()) as EventRow[];
      setEvents(rows);
    } catch (err) {
      console.error("[useEvents] Query error:", err);
      // Race check — only clear on current query
      if (currentQueryId === queryIdRef.current) {
        setEvents([]);
        setTotalCount(0);
      }
    } finally {
      if (currentQueryId === queryIdRef.current) {
        setIsQuerying(false);
      }
    }
  }, [connection, filters]);

  useEffect(() => {
    if (!connection) return;

    const timer = setTimeout(() => {
      executeQuery();
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [executeQuery, connection]);

  return { events, totalCount, isQuerying };
}
