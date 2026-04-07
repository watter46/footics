/**
 * DuckDB-WASM Singleton Manager
 *
 * 設計意図:
 * - module-scope の Promise で初期化を管理し、何度呼んでも同じインスタンスを返す（冪等性）。
 * - HMR (Hot Module Replacement) 時に globalThis にキャッシュし、二重初期化を防止。
 * - Worker の Blob URL は使用後即座に revoke してメモリリークを回避。
 */
import * as duckdb from "@duckdb/duckdb-wasm";

interface DuckDBInstance {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
}

// HMR対応: globalThis にキャッシュ

declare global {
  // eslint-disable-next-line no-var
  var __footics_duckdb_instance: Promise<DuckDBInstance> | undefined;
  // eslint-disable-next-line no-var
  var __footics_duckdb_match_id: string | null;
}

/**
 * 初期化 Promise のキャッシュ。
 * モジュールロード時は undefined → 最初の initializeDuckDB() 呼び出しで確定。
 */
let initPromise: Promise<DuckDBInstance> | undefined =
  globalThis.__footics_duckdb_instance;

/**
 * 現在ロードされている試合IDを追跡（セッションキャッシュ）
 */
export function getCurrentlyLoadedMatchId(): string | null {
  return globalThis.__footics_duckdb_match_id || null;
}

export function setCurrentlyLoadedMatchId(matchId: string | null) {
  globalThis.__footics_duckdb_match_id = matchId;
}

/**
 * DuckDB-WASM インスタンスを初期化し、接続を返す。
 * 冪等 — 何度呼んでも同じ Promise を返す。
 */
export function initializeDuckDB(): Promise<DuckDBInstance> {
  if (initPromise) return initPromise;

  initPromise = createInstance();
  // HMR で module が再評価されても同じインスタンスを維持
  globalThis.__footics_duckdb_instance = initPromise;
  return initPromise;
}

async function createInstance(): Promise<DuckDBInstance> {
  const origin = window.location.origin;
  // ローカル配信用のバンドル設定
  const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
    mvp: {
      mainModule: `${origin}/static/duckdb/duckdb-mvp.wasm`,
      mainWorker: `${origin}/static/duckdb/duckdb-browser-mvp.worker.js`,
    },
    eh: {
      mainModule: `${origin}/static/duckdb/duckdb-eh.wasm`,
      mainWorker: `${origin}/static/duckdb/duckdb-browser-eh.worker.js`,
    },
  };

  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

  // COI (Cross-Origin Isolation) が有効な場合は COI バンドルを優先する等のロジックも可能だが、
  // 現状は MVP/EH の出し分けで十分高速。

  // CORS 対応: Blob Worker
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], {
      type: "text/javascript",
    })
  );
  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();

  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  // Blob URL を即座に revoke
  URL.revokeObjectURL(workerUrl);

  const conn = await db.connect();

  return { db, conn };
}

/**
 * 現在のインスタンスを取得（初期化済みの場合のみ）。
 * 未初期化なら null を返す。
 */
export function getDuckDBInstance(): Promise<DuckDBInstance> | null {
  return initPromise ?? null;
}
