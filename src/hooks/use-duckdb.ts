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
import { getMatch } from "@/lib/db";
import type { DatabaseState, DatabaseStatus, MatchMetadata } from "@/types";
import type { AsyncDuckDBConnection, AsyncDuckDB } from "@duckdb/duckdb-wasm";

// ── Reducer ──

type Action =
  | { type: "SET_STATUS"; status: DatabaseStatus }
  | { type: "SET_READY"; db: AsyncDuckDB; connection: AsyncDuckDBConnection; metadata: MatchMetadata; cacheMissing?: boolean }
  | { type: "SET_ERROR"; error: string; db?: AsyncDuckDB; connection?: AsyncDuckDBConnection };

const initialState: DatabaseState = {
  status: "idle",
  db: null,
  connection: null,
  error: null,
  metadata: null,
  cacheMissing: false,
};

function reducer(state: DatabaseState, action: Action): DatabaseState {
  switch (action.type) {
    case "SET_STATUS":
      return { ...state, status: action.status, error: null, metadata: null };
    case "SET_READY":
      return {
        status: "ready",
        db: action.db,
        connection: action.connection,
        metadata: action.metadata,
        cacheMissing: action.cacheMissing || false,
        error: null,
      };
    case "SET_ERROR":
      return { 
        ...state, 
        status: "error", 
        error: action.error,
        db: action.db ?? state.db,
        connection: action.connection ?? state.connection,
      };
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
      console.log(`[useDuckDB] Start loading for matchId: ${matchId}`);
      try {
        dispatch({ type: "SET_STATUS", status: "initializing" });
        const { db, conn } = await initializeDuckDB();
        if (cancelled) return;

        dispatch({ type: "SET_STATUS", status: "loading-data" });
        const { metadata } = await loadMatchData(db, conn, matchId);
        if (cancelled) return;

        console.log(`[useDuckDB] Successfully loaded matchId: ${matchId}`);
        dispatch({ type: "SET_READY", db, connection: conn, metadata });
      } catch (err: unknown) {
        if (cancelled) return;

        // DuckDB の初期化自体は成功しているか確認
        let currentDb: AsyncDuckDB | null = null;
        let currentConn: AsyncDuckDBConnection | null = null;
        
        try {
          const res = await initializeDuckDB();
          currentDb = res.db;
          currentConn = res.conn;
        } catch (e) {
          // DuckDB 自体の初期化に失敗している場合は追わない
        }

        // キャッシュがない場合、metadata だけでも footics_db から復旧できないか試みる
        if (currentDb && currentConn) {
          try {
            const matchFromDb = await getMatch(matchId);
            if (matchFromDb) {
              const partialMetadata: MatchMetadata = {
                matchId: matchFromDb.id,
                date: matchFromDb.date,
                score: matchFromDb.score,
                matchType: matchFromDb.matchType,
                teams: {
                  home: { teamId: matchFromDb.homeTeam.id, name: matchFromDb.homeTeam.name, players: [] } as any,
                  away: { teamId: matchFromDb.awayTeam.id, name: matchFromDb.awayTeam.name, players: [] } as any,
                },
                playerIdNameDictionary: {},
              };
              dispatch({ 
                type: "SET_READY", 
                db: currentDb, 
                connection: currentConn, 
                metadata: partialMetadata,
                cacheMissing: true 
              });
              return;
            }
          } catch (dbErr) {
            console.warn("[useDuckDB] Metadata recovery failed", dbErr);
          }
        }

        console.error(`[useDuckDB] Error loading matchId: ${matchId}`, err);
        const message =
          err instanceof Error ? err.message : "Unknown initialization error";
        
        dispatch({ type: "SET_ERROR", error: message, db: currentDb || undefined, connection: currentConn || undefined });
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return state;
}
