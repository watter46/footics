"use client";

/**
 * useDuckDB — DuckDB の接続状態を管理する React Hook
 *
 * 状態マシン:
 *   idle → initializing → loading-data → ready
 *                                      ↘ error
 *
 * F5問題の解決:
 * - initializeDuckDB() は冪等 (同じ Promise を返す) ため、
 *   useEffect の再実行時に二重初期化が起きない。
 * - StrictMode の二重レンダリングにも対応。
 */
import { useEffect, useReducer } from "react";
import { initializeDuckDB, loadMatchData } from "@/lib/duckdb";
import type { DatabaseState, DatabaseStatus, MatchMetadata } from "@/types";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

// ── Reducer ──

type Action =
  | { type: "SET_STATUS"; status: DatabaseStatus }
  | { type: "SET_READY"; db: AsyncDuckDB; connection: AsyncDuckDBConnection; metadata: MatchMetadata }
  | { type: "SET_ERROR"; error: string };

const initialState: DatabaseState = {
  status: "idle",
  db: null,
  connection: null,
  error: null,
  metadata: null,
};

function reducer(state: DatabaseState, action: Action): DatabaseState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status, error: null };
    case "SET_READY":
      return {
        status: "ready",
        db: action.db,
        connection: action.connection,
        metadata: action.metadata,
        error: null,
      };
    case "SET_ERROR":
      return { ...state, status: "error", error: action.error };
    default:
      return state;
  }
}

// ── Hook ──

export function useDuckDB(matchId: string): DatabaseState {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        dispatch({ type: "SET_STATUS", status: "initializing" });
        const { db, conn } = await initializeDuckDB();
        if (cancelled) return;

        dispatch({ type: "SET_STATUS", status: "loading-data" });
        const { metadata } = await loadMatchData(db, conn, matchId);
        if (cancelled) return;

        dispatch({ type: "SET_READY", db, connection: conn, metadata });
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Unknown initialization error";
        dispatch({ type: "SET_ERROR", error: message });
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return state;
}
