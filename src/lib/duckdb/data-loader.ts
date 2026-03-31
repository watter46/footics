/**
 * Data Loader — JSON → DuckDB Tables + IndexedDB Persistence
 *
 * データパイプライン:
 * 1. IndexedDB にキャッシュが存在するか確認
 * 2. キャッシュあり → Parquet バイナリから直接テーブル復元（高速パス）
 * 3. キャッシュなし → エラー（インポートが必要）
 *
 * IndexedDB 構造:
 *   DB名: "footlog_cache"
 *   Store: "parquet_store"
 *   Key: "match_<matchId>" → { version, matchesParquet, playersParquet, eventsParquet, metadata }
 */
import type * as duckdb from "@duckdb/duckdb-wasm";
import type { MatchRoot, MatchMetadata, MatchSummary } from "@/types";
import { getCustomEventsByMatch } from "@/lib/db";


const IDB_NAME = "footics_cache";
const IDB_STORE = "parquet_store";
export const CACHE_VERSION = 5; // バンプしてキャッシュ無効化可能

// ──────────────────────────────────────────────
// IndexedDB ヘルパー
// ──────────────────────────────────────────────

export interface CacheEntry {
  version: number;
  matchesParquet: ArrayBuffer;
  playersParquet: ArrayBuffer;
  eventsParquet: ArrayBuffer;
  metadata: MatchMetadata;
}

let idbConnection: IDBDatabase | null = null;
let idbOpenPromise: Promise<IDBDatabase> | null = null;

export function openCacheDB(): Promise<IDBDatabase> {
  if (idbConnection) return Promise.resolve(idbConnection);
  if (idbOpenPromise) return idbOpenPromise;

  idbOpenPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => {
      idbConnection = request.result;
      idbOpenPromise = null;
      resolve(idbConnection);
    };
    request.onerror = () => {
      idbOpenPromise = null;
      reject(request.error);
    };
  });
  return idbOpenPromise;
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

export function idbPut(db: IDBDatabase, key: string, value: CacheEntry): Promise<void> {
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
  const buffer = await db.copyFileToBuffer(fileName);
  // もとの Uint8Array のコピーを作成し、その中の ArrayBuffer を返すことで
  // メモリのオフセット不整合や意図しない共有を完全に防ぐ
  return new Uint8Array(buffer).slice().buffer as ArrayBuffer;
}

async function importParquetAsTable(
  conn: duckdb.AsyncDuckDBConnection,
  db: duckdb.AsyncDuckDB,
  tableName: string,
  parquetBuffer: ArrayBuffer,
  matchId: string
): Promise<void> {
  // ファイル名の競合を避けるため matchId とタイムスタンプを含めてユニーク化
  const fileName = `${tableName}_${matchId}_${Date.now()}.parquet`;
  
  try {
    // バッファのコピーを確実に渡す (Brave 等の Shield/メモリ制限対策)
    const uint8View = new Uint8Array(parquetBuffer);
    await db.registerFileBuffer(fileName, uint8View);
    
    await conn.query(
      `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${fileName}')`
    );
  } catch (err: any) {
    console.error(`[footics] Failed to import parquet table ${tableName} for match ${matchId}:`, err);
    throw err;
  } finally {
    // 読み込み完了後、即座に VFS からファイルを解除してメモリを解放
    try {
      await db.dropFile(fileName);
    } catch (e) {
      // unregister の失敗は致命的でないため警告のみ
      console.warn(`[footics] Cleanup failed for ${fileName}`, e);
    }
  }
}

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────

export interface LoadResult {
  metadata: MatchMetadata;
}

export interface BatchImportResult {
  total: number;
  success: number;
  skipped: number;
  failed: number;
  errors: { fileName: string; errorMessage: string }[];
}

/**
 * マッチデータをロードし、DuckDB テーブルを作成する。
 * IndexedDB キャッシュがあればそちらから復元（高速パス）。
 */
export async function loadMatchData(
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  matchId: string,
  _isRetry = false
): Promise<LoadResult> {
  // 1. IndexedDB キャッシュ確認
  try {
    const idb = await openCacheDB();
    const cached = await idbGet(idb, `match_${matchId}`);

    if (cached && cached.version === CACHE_VERSION) {
      if (_isRetry) console.log(`[footics] Retry success for ${matchId}`);
      console.log(`[footics] Cache hit for ${matchId} — restoring from IndexedDB Parquet`);
      const start = performance.now();

      await Promise.all([
        importParquetAsTable(conn, db, "matches", cached.matchesParquet, matchId),
        importParquetAsTable(conn, db, "players", cached.playersParquet, matchId),
        importParquetAsTable(conn, db, "events", cached.eventsParquet, matchId),
      ]);

      console.log(
        `[footics] Success: Restored match ${matchId} from cache in ${(performance.now() - start).toFixed(0)}ms`
      );

      // Load custom events
      await loadCustomEventsToDuckDB(db, conn, matchId);

      return { metadata: cached.metadata };
    } else if (cached) {
      console.warn(`[footics] Cache version mismatch for ${matchId}: expected ${CACHE_VERSION}, found ${cached.version}`);
    } else {
      console.warn(`[footics] Cache entry for ${matchId} not found in IndexedDB`);
    }
  } catch (err) {
    if (!_isRetry) {
      console.warn(`[footics] Load failed for ${matchId}, retrying once...`, err);
      await new Promise(r => setTimeout(r, 200));
      return loadMatchData(db, conn, matchId, true);
    }
    console.error(`[footics] Data load failed after retry for match ${matchId}:`, err);
    throw err;
  }

  // キャッシュがない場合はエラー
  throw new Error(`Match ${matchId} not found in local storage. Please use "Data Import" to add this match.`);
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
        console.log(`[footics] Cache cleared for match_${matchId}`);
        resolve();
      };
      request.onerror = () => {
        console.error(`[footics] Failed to clear cache for match_${matchId}`);
        reject(request.error);
      };
    });
  } catch (err) {
    console.error(`[footics] Failed to open cache DB for clearing`, err);
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
    console.warn("[footics] Error checking match cache", err);
    return false;
  }
}

/**
 * IndexedDB にキャッシュされている全試合のメタデータを取得し、
 * MatchSummary 形式で返す。
 */
export async function getAllCachedMatches(): Promise<MatchSummary[]> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const request = store.getAll(); // 全エントリ取得(件数が少ない前提)
      
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const summaries: MatchSummary[] = entries.map(entry => {
          const m = entry.metadata;
          return {
            id: m.matchId || "unknown", // メタデータから取得、なければ unknown (旧形式対応用)
            homeTeam: { 
              id: m.teams?.home?.teamId ?? 0, 
              name: m.teams?.home?.name ?? "Home" 
            },
            awayTeam: { 
              id: m.teams?.away?.teamId ?? 1, 
              name: m.teams?.away?.name ?? "Away" 
            },
            date: m.date || "",
            score: m.score || "0 : 0",
            matchType: m.matchType || "club",
          };
        });
        resolve(summaries);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn("[footics] Error getting all cached matches", err);
    return [];
  }
}

/**
 * IndexedDB から全キャッシュエントリを直接取得する（エクスポート用）
 */
export async function getAllCacheEntries(): Promise<{ key: string; value: CacheEntry }[]> {
  try {
    const db = await openCacheDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      
      const results: { key: string; value: CacheEntry }[] = [];
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push({
            key: cursor.key as string,
            value: cursor.value as CacheEntry
          });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("[footics] Failed to get all cache entries", err);
    return [];
  }
}

/**
 * 複数のキャッシュエントリを一括で IndexedDB に保存する。
 * 単一のトランザクションを使用し、oncomplete を待機することで
 * データの不整合とリロード時の破損を防ぐ。
 */
export async function importCacheEntriesBatch(
  entries: { key: string; value: CacheEntry }[]
): Promise<void> {
  const db = await openCacheDB();
  
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    
    tx.oncomplete = () => {
      console.log(`[footics] Batch cache import completed (${entries.length} entries)`);
      resolve();
    };
    tx.onerror = () => {
      console.error("[footics] Batch cache import failed", tx.error);
      reject(tx.error);
    };
    
    for (const entry of entries) {
      store.put(entry.value, entry.key);
    }
  });
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
 * ナショナルデータ特有の構造をパースして正規化する
 */
function parseNationalMatchData(data: any) {
  const matchId = data.matchId;
  const scrap = data.initialMatchDataForScrappers;
  
  // scrap[0][0] contains match info
  const info = scrap[0][0];
  const homeTeamId = info[0];
  const awayTeamId = info[1];
  const homeTeamName = info[2] || info[13] || "Home";
  const awayTeamName = info[3] || info[14] || "Away";
  const score = info[12] || info[8] || "0 : 0"; 
  const rawDate = info[4] || ""; 
  
  let date = "";
  if (rawDate) {
    const parts = rawDate.split(" ")[0].split("/");
    if (parts.length === 3) {
      date = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const playerInfo = scrap[0][2];
  const homeLineup = playerInfo[9] || [];
  const awayLineup = playerInfo[10] || [];
  const homeSubsList = playerInfo[11] || [];
  const awaySubsList = playerInfo[12] || [];

  const playerIdNameDictionary: Record<string, string> = {};

  const mapPlayers = (list: any[], teamId: number, isFirstEleven: boolean) => {
    return list.map((p: any) => {
      const name = p[0];
      const playerId = p[3] || Math.floor(Math.random() * 1000000);
      playerIdNameDictionary[String(playerId)] = name;
      return {
        match_id: matchId,
        team_id: teamId,
        player_id: playerId,
        shirt_no: 0,
        name: name,
        position: isFirstEleven ? "FW" : "Sub",
        is_first_eleven: isFirstEleven,
      };
    });
  };

  const players = [
    ...mapPlayers(homeLineup, homeTeamId, true),
    ...mapPlayers(homeSubsList, homeTeamId, false),
    ...mapPlayers(awayLineup, awayTeamId, true),
    ...mapPlayers(awaySubsList, awayTeamId, false),
  ];

  const matches = [
    {
      match_id: matchId,
      start_time: date,
      venue_name: "International Venue",
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      score: score,
    },
  ];

  const events: any[] = [];

  const metadata: MatchMetadata = {
    matchId: String(matchId),
    date: date,
    score: score,
    matchType: "national",
    playerIdNameDictionary,
    teams: {
      home: { teamId: homeTeamId, name: homeTeamName, players: [] } as any,
      away: { teamId: awayTeamId, name: awayTeamName, players: [] } as any,
    },
  };

  return { matches, players, events, metadata };
}

/**
 * 複数のJSONファイルを一括でインポートする。
 * 重複する試合は自動的にスキップされる。
 */
export async function importMatchesBatch(
  files: File[],
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  onProgress?: (current: number, total: number) => void
): Promise<BatchImportResult> {
  const result: BatchImportResult = {
    total: files.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const idb = await openCacheDB();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, files.length);

    try {
      // 1. 最小限のパースで matchId を取得して重複チェック
      const text = await file.text();
      const data = JSON.parse(text) as MatchRoot;
      const matchId = String(data.matchId);

      // checkMatchExists を直接 idb で実行して高速化
      const cached = await idbGet(idb, `match_${matchId}`);
      const exists = !!cached && cached.version === CACHE_VERSION;

      if (exists) {
        console.log(`[footics] Batch import: Skipping match ${matchId} (already exists)`);
        result.skipped++;
        continue;
      }

      // 2. インポート実行
      await importMatchJsonFileCore(data, db, conn, idb);
      result.success++;
    } catch (err: any) {
      console.error(`[footics] Batch import failed for ${file.name}:`, err);
      result.failed++;
      result.errors.push({
        fileName: file.name,
        errorMessage: err.message || "Unknown error",
      });
    }
  }

  return result;
}

/**
 * importMatchJsonFile のコアロジックを分離し、パース済みデータとDB接続を再利用可能にする
 */
async function importMatchJsonFileCore(
  data: MatchRoot,
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  idb: IDBDatabase
): Promise<string> {
  const matchId = String(data.matchId);
  const start = performance.now();

  let matches: any[] = [];
  let players: any[] = [];
  let events: any[] = [];
  let metadata: MatchMetadata;

  if ("matchCentreData" in data) {
    const mc = data.matchCentreData;
    matches = [
      {
        match_id: data.matchId,
        start_time: mc.startTime,
        venue_name: mc.venueName,
        home_team_id: mc.home.teamId,
        away_team_id: mc.away.teamId,
        score: mc.score,
      },
    ];

    players = [
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

    events = mc.events.map((e) => ({
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

    metadata = {
      matchId,
      date: mc.startTime ? mc.startTime.split("T")[0] : "",
      score: mc.score,
      matchType: "club",
      playerIdNameDictionary: mc.playerIdNameDictionary,
      teams: { home: mc.home, away: mc.away },
    };
  } else if ("initialMatchDataForScrappers" in data) {
    const result = parseNationalMatchData(data);
    matches = result.matches;
    players = result.players;
    events = result.events;
    metadata = result.metadata;
  } else {
    throw new Error("Unknown JSON format.");
  }

  await db.registerFileText("matches.json", JSON.stringify(matches));
  await db.registerFileText("players.json", JSON.stringify(players));
  await db.registerFileText("events.json", JSON.stringify(events));

  await conn.query(`
    CREATE OR REPLACE TABLE matches AS SELECT * FROM read_json_auto('matches.json');
    CREATE OR REPLACE TABLE players AS SELECT * FROM read_json_auto('players.json');
    CREATE OR REPLACE TABLE events AS SELECT * FROM read_json_auto('events.json');
  `);

  await loadCustomEventsToDuckDB(db, conn, matchId);

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

  console.log(`[footics] Import ${matchId} done in ${(performance.now() - start).toFixed(0)}ms`);
  return matchId;
}

/**
 * JSONファイルから直接マッチデータを読み込んでインポートする（単一ファイル用）
 */
export async function importMatchJsonFile(
  file: File,
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection
): Promise<string> {
  const text = await file.text();
  const data = JSON.parse(text) as MatchRoot;
  const idb = await openCacheDB();
  return importMatchJsonFileCore(data, db, conn, idb);
}
