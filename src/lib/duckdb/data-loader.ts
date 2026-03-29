/**
 * Data Loader — JSON → DuckDB Tables + IndexedDB Persistence
 *
 * データパイプライン:
 * 1. IndexedDB にキャッシュが存在するか確認
 * 2. キャッシュあり → Parquet バイナリから直接テーブル復元（高速パス）
 * 3. キャッシュなし → fetch JSON → parse → テーブル作成 → Parquet で IndexedDB 保存
 *
 * IndexedDB 構造:
 *   DB名: "footlog_cache"
 *   Store: "parquet_store"
 *   Key: "match_<matchId>" → { version, matchesParquet, playersParquet, eventsParquet, metadata }
 */
import type * as duckdb from "@duckdb/duckdb-wasm";
import type { MatchRoot, MatchMetadata } from "@/types";
import { getCustomEventsByMatch } from "@/lib/db";


const IDB_NAME = "footlog_cache";
const IDB_STORE = "parquet_store";
const CACHE_VERSION = 5; // バンプしてキャッシュ無効化可能

// ──────────────────────────────────────────────
// IndexedDB ヘルパー
// ──────────────────────────────────────────────

interface CacheEntry {
  version: number;
  matchesParquet: ArrayBuffer;
  playersParquet: ArrayBuffer;
  eventsParquet: ArrayBuffer;
  metadata: MatchMetadata;
}

function openCacheDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(db: IDBDatabase, key: string): Promise<CacheEntry | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result as CacheEntry | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbPut(db: IDBDatabase, key: string, value: CacheEntry): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ──────────────────────────────────────────────
// Parquet Export / Import
// ──────────────────────────────────────────────

async function exportTableAsParquet(
  conn: duckdb.AsyncDuckDBConnection,
  db: duckdb.AsyncDuckDB,
  tableName: string
): Promise<ArrayBuffer> {
  const fileName = `${tableName}.parquet`;
  await conn.query(`COPY ${tableName} TO '${fileName}' (FORMAT PARQUET)`);
  const buffer = await db.copyFileToBuffer(fileName);
  return buffer.slice().buffer as ArrayBuffer;
}

async function importParquetAsTable(
  conn: duckdb.AsyncDuckDBConnection,
  db: duckdb.AsyncDuckDB,
  tableName: string,
  parquetBuffer: ArrayBuffer
): Promise<void> {
  const fileName = `${tableName}.parquet`;
  await db.registerFileBuffer(fileName, new Uint8Array(parquetBuffer));
  await conn.query(
    `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${fileName}')`
  );
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export interface LoadResult {
  metadata: MatchMetadata;
}

/**
 * マッチデータをロードし、DuckDB テーブルを作成する。
 * IndexedDB キャッシュがあればそちらから復元（高速パス）。
 */
export async function loadMatchData(
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  matchId: string
): Promise<LoadResult> {
  // 1. IndexedDB キャッシュ確認
  let idb: IDBDatabase | null = null;
  try {
    idb = await openCacheDB();
    const cached = await idbGet(idb, `match_${matchId}`);

    if (cached && cached.version === CACHE_VERSION) {
      console.log("[FootLog] Cache hit — restoring from IndexedDB Parquet");
      const start = performance.now();

      await Promise.all([
        importParquetAsTable(conn, db, "matches", cached.matchesParquet),
        importParquetAsTable(conn, db, "players", cached.playersParquet),
        importParquetAsTable(conn, db, "events", cached.eventsParquet),
      ]);

      console.log(
        `[FootLog] Restored from cache in ${(performance.now() - start).toFixed(0)}ms`
      );

      // Load custom events
      await loadCustomEventsToDuckDB(db, conn, matchId);

      return { metadata: cached.metadata };
    }
  } catch (err) {
    console.warn("[FootLog] IndexedDB cache unavailable, falling back to JSON", err);
  }

  // 2. JSON フルロード
  console.log("[FootLog] Cache miss — loading from JSON");
  const start = performance.now();

  const res = await fetch(`/data/match_${matchId}.json`);
  if (!res.ok) throw new Error(`Failed to fetch match_${matchId}.json`);
  const data = (await res.json()) as MatchRoot;
  const mc = data.matchCentreData;

  // Flatten data
  const matches = [
    {
      match_id: data.matchId,
      start_time: mc.startTime,
      venue_name: mc.venueName,
      home_team_id: mc.home.teamId,
      away_team_id: mc.away.teamId,
      score: mc.score,
    },
  ];

  const players = [
    ...mc.home.players.map((p) => ({
      match_id: data.matchId,
      team_id: mc.home.teamId,
      player_id: p.playerId,
      shirt_no: p.shirtNo,
      name: p.name,
      position: p.position,
      is_first_eleven: p.isFirstEleven,
    })),
    ...mc.away.players.map((p) => ({
      match_id: data.matchId,
      team_id: mc.away.teamId,
      player_id: p.playerId,
      shirt_no: p.shirtNo,
      name: p.name,
      position: p.position,
      is_first_eleven: p.isFirstEleven,
    })),
  ];

  const events = mc.events.map((e) => ({
    id: e.id,
    match_id: data.matchId,
    event_id: e.eventId,
    team_id: e.teamId,
    player_id: e.playerId || null,
    period: e.period.value,
    minute: e.minute,
    second: e.second,
    expanded_minute: e.expandedMinute,
    x: e.x,
    y: e.y,
    end_x: e.endX || null,
    end_y: e.endY || null,
    type_value: e.type.value,
    type_name: e.type.displayName,
    outcome: e.outcomeType.value === 1,
    is_touch: e.isTouch || false,
    is_shot: e.isShot || false,
    is_goal: e.isGoal || false,
    qualifiers: e.qualifiers || [],
  }));

  // Register and create tables
  await db.registerFileText("matches.json", JSON.stringify(matches));
  await db.registerFileText("players.json", JSON.stringify(players));
  await db.registerFileText("events.json", JSON.stringify(events));

  await conn.query(`
    CREATE OR REPLACE TABLE matches AS SELECT * FROM read_json_auto('matches.json');
    CREATE OR REPLACE TABLE players AS SELECT * FROM read_json_auto('players.json');
    CREATE OR REPLACE TABLE events AS SELECT * FROM read_json_auto('events.json');
  `);

  const metadata: MatchMetadata = {
    playerIdNameDictionary: mc.playerIdNameDictionary,
    teams: { home: mc.home, away: mc.away },
  };

  // Load custom events
  await loadCustomEventsToDuckDB(db, conn, matchId);

  console.log(
    `[FootLog] Full load completed in ${(performance.now() - start).toFixed(0)}ms`
  );

  // 3. IndexedDB にキャッシュ保存（非同期、エラーは無視）
  if (idb) {
    try {
      const [matchesParquet, playersParquet, eventsParquet] = await Promise.all([
        exportTableAsParquet(conn, db, "matches"),
        exportTableAsParquet(conn, db, "players"),
        exportTableAsParquet(conn, db, "events"),
      ]);

      await idbPut(idb, `match_${matchId}`, {
        version: CACHE_VERSION,
        matchesParquet,
        playersParquet,
        eventsParquet,
        metadata,
      });
      console.log("[FootLog] Cached to IndexedDB for next load");
    } catch (err) {
      console.warn("[FootLog] Failed to cache to IndexedDB", err);
    }
  }

  return { metadata };
}

/**
 * IndexedDB の特定の matchId のキャッシュをクリアする
 */
export async function clearMatchCache(matchId: string): Promise<void> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      const request = store.delete(`match_${matchId}`);
      request.onsuccess = () => {
        console.log(`[FootLog] Cache cleared for match_${matchId}`);
        resolve();
      };
      request.onerror = () => {
        console.error(`[FootLog] Failed to clear cache for match_${matchId}`);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(`[FootLog] Failed to open cache DB for clearing`, err);
  }
}

/**
 * 指定された matchId のキャッシュが存在するか確認する
 */
export async function checkMatchExists(matchId: string): Promise<boolean> {
  try {
    const idb = await openCacheDB();
    const cached = await idbGet(idb, `match_${matchId}`);
    return !!cached && cached.version === CACHE_VERSION;
  } catch (err) {
    console.warn("[FootLog] Error checking match cache", err);
    return false;
  }
}

/**
 * カスタムイベントを DuckDB にロード
 */
export async function loadCustomEventsToDuckDB(
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  matchId: string
): Promise<void> {
  const customEvents = await getCustomEventsByMatch(matchId);
  // labels配列を label VARCHAR（" / " 結合）に変換して DuckDB に渡す
  const rows = customEvents.map(e => ({
    ...e,
    label: Array.isArray(e.labels) ? e.labels.join(" / ") : (e as any).label ?? "",
  }));
  await db.registerFileText("custom_events.json", JSON.stringify(rows));
  await conn.query(`
    CREATE OR REPLACE TABLE custom_events AS 
    SELECT * FROM read_json('custom_events.json', columns={
      'id': 'VARCHAR',
      'match_id': 'VARCHAR',
      'minute': 'INTEGER',
      'second': 'INTEGER',
      'label': 'VARCHAR',
      'memo': 'VARCHAR',
      'created_at': 'BIGINT'
    });
  `);
}

/**
 * JSONファイルから直接マッチデータを読み込んでインポートする
 * 成功時には新しい matchId を返す
 */
export async function importMatchJsonFile(
  file: File,
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection
): Promise<string> {
  const text = await file.text();
  const data = JSON.parse(text) as MatchRoot;
  const matchId = String(data.matchId);
  const mc = data.matchCentreData;


  const start = performance.now();
  console.log(`[FootLog] Importing match ${matchId} from file...`);

  // Flatten data
  const matches = [
    {
      match_id: data.matchId,
      start_time: mc.startTime,
      venue_name: mc.venueName,
      home_team_id: mc.home.teamId,
      away_team_id: mc.away.teamId,
      score: mc.score,
    },
  ];

  const players = [
    ...mc.home.players.map((p) => ({
      match_id: data.matchId,
      team_id: mc.home.teamId,
      player_id: p.playerId,
      shirt_no: p.shirtNo,
      name: p.name,
      position: p.position,
      is_first_eleven: p.isFirstEleven,
    })),
    ...mc.away.players.map((p) => ({
      match_id: data.matchId,
      team_id: mc.away.teamId,
      player_id: p.playerId,
      shirt_no: p.shirtNo,
      name: p.name,
      position: p.position,
      is_first_eleven: p.isFirstEleven,
    })),
  ];

  const events = mc.events.map((e) => ({
    id: e.id,
    match_id: data.matchId,
    event_id: e.eventId,
    team_id: e.teamId,
    player_id: e.playerId || null,
    period: e.period.value,
    minute: e.minute,
    second: e.second,
    expanded_minute: e.expandedMinute,
    x: e.x,
    y: e.y,
    end_x: e.endX || null,
    end_y: e.endY || null,
    type_value: e.type.value,
    type_name: e.type.displayName,
    outcome: e.outcomeType.value === 1,
    is_touch: e.isTouch || false,
    is_shot: e.isShot || false,
    is_goal: e.isGoal || false,
    qualifiers: e.qualifiers || [],
  }));

  // Register and create tables
  await db.registerFileText("matches.json", JSON.stringify(matches));
  await db.registerFileText("players.json", JSON.stringify(players));
  await db.registerFileText("events.json", JSON.stringify(events));

  await conn.query(`
    CREATE OR REPLACE TABLE matches AS SELECT * FROM read_json_auto('matches.json');
    CREATE OR REPLACE TABLE players AS SELECT * FROM read_json_auto('players.json');
    CREATE OR REPLACE TABLE events AS SELECT * FROM read_json_auto('events.json');
  `);

  const metadata: MatchMetadata = {
    playerIdNameDictionary: mc.playerIdNameDictionary,
    teams: { home: mc.home, away: mc.away },
  };

  // カスタムイベントの読み込み
  await loadCustomEventsToDuckDB(db, conn, matchId);

  // IndexedDB にキャッシュ保存
  try {
    const idb = await openCacheDB();
    const [matchesParquet, playersParquet, eventsParquet] = await Promise.all([
      exportTableAsParquet(conn, db, "matches"),
      exportTableAsParquet(conn, db, "players"),
      exportTableAsParquet(conn, db, "events"),
    ]);

    await idbPut(idb, `match_${matchId}`, {
      version: CACHE_VERSION,
      matchesParquet,
      playersParquet,
      eventsParquet,
      metadata,
    });
    console.log(`[FootLog] Match ${matchId} cached to IndexedDB`);
  } catch (err) {
    console.warn("[FootLog] Failed to cache to IndexedDB", err);
  }

  console.log(
    `[FootLog] Import completed in ${(performance.now() - start).toFixed(0)}ms`
  );

  return matchId;
}
