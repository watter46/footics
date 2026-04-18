import type * as duckdb from '@duckdb/duckdb-wasm';
import {
  getCustomEventsByMatch,
  getMatchBlobs,
  saveMatchUnified,
} from '@/lib/db';
import type {
  MatchBlobEntry,
  MatchMetadata,
  MatchRoot,
  MatchSummary,
} from '@/types';

// ──────────────────────────────────────────────
// Parquet Export / Import
// ──────────────────────────────────────────────

async function exportTableAsParquet(
  conn: duckdb.AsyncDuckDBConnection,
  db: duckdb.AsyncDuckDB,
  tableName: string,
): Promise<ArrayBuffer> {
  const fileName = `${tableName}_export_${Date.now()}.parquet`;

  try {
    // 1. メモリ上のテーブルを VFS 上の Parquet ファイルとして書き出し
    await conn.query(
      `COPY (SELECT * FROM ${tableName}) TO '${fileName}' (FORMAT PARQUET)`,
    );

    // 2. VFS 上のファイルをバッファに取得
    const buffer = await db.copyFileToBuffer(fileName);

    // バッファのコピーを返す
    return new Uint8Array(buffer).slice().buffer as ArrayBuffer;
  } finally {
    // 3. VFS 上のテンポラリファイルを削除
    try {
      await db.dropFile(fileName);
    } catch (e) {
      // Ignore
    }
  }
}

async function importParquetAsTable(
  conn: duckdb.AsyncDuckDBConnection,
  db: duckdb.AsyncDuckDB,
  tableName: string,
  parquetBuffer: ArrayBuffer,
  matchId: string,
): Promise<void> {
  // ファイル名の競合を避けるため matchId とタイムスタンプを含めてユニーク化
  const fileName = `${tableName}_${matchId}_${Date.now()}.parquet`;

  try {
    // バッファを VFS に登録
    const uint8View = new Uint8Array(parquetBuffer);
    await db.registerFileBuffer(fileName, uint8View);

    // 既存テーブルを置換（または新規作成）して Parquet から読み込み
    await conn.query(
      `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_parquet('${fileName}')`,
    );
  } catch (err: any) {
    console.error(
      `[footics] Failed to import parquet table ${tableName} for match ${matchId}:`,
      err,
    );
    throw err;
  } finally {
    // 読み込み完了後、即座に VFS からファイルを解除してメモリを解放
    try {
      await db.dropFile(fileName);
    } catch (e) {
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

import {
  getCurrentlyLoadedMatchId,
  setCurrentlyLoadedMatchId,
} from './singleton';

/**
 * マッチデータをロードし、DuckDB テーブルを作成する。
 * Unified DB (footics_db) から Parquet バイナリをロードする。
 */
export async function loadMatchData(
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  matchId: string,
  _isRetry = false,
): Promise<LoadResult> {
  const start = performance.now();

  // セッションキャッシュのチェック
  if (getCurrentlyLoadedMatchId() === matchId && !_isRetry) {
    console.log(
      `[footics] Match ${matchId} is already loaded in DuckDB. Skipping data load.`,
    );
    // metadata だけ取得して返す必要がある。
    // metadata は entry に含まれているので、結局 getMatchBlobs は呼ぶ必要があるが、
    // 重い Parquet のテーブル構築をスキップできる。
    const entry = await getMatchBlobs(matchId);
    if (entry) {
      return { metadata: entry.metadata };
    }
  }

  console.log(`[footics] Loading match ${matchId} from Unified DB...`);

  try {
    const entry = await getMatchBlobs(matchId);

    if (entry) {
      await Promise.all([
        importParquetAsTable(
          conn,
          db,
          'matches',
          entry.matchesParquet,
          matchId,
        ),
        importParquetAsTable(
          conn,
          db,
          'players',
          entry.playersParquet,
          matchId,
        ),
        importParquetAsTable(conn, db, 'events', entry.eventsParquet, matchId),
      ]);

      console.log(
        `[footics] Success: Restored match ${matchId} from Unified DB in ${(performance.now() - start).toFixed(0)}ms`,
      );

      // カスタムイベントのロード
      await loadCustomEventsToDuckDB(db, conn, matchId);

      // ロード済み ID を更新
      setCurrentlyLoadedMatchId(matchId);

      return { metadata: entry.metadata };
    }
  } catch (err) {
    if (!_isRetry) {
      console.warn(
        `[footics] Load failed for ${matchId}, retrying once...`,
        err,
      );
      await new Promise((r) => setTimeout(r, 200));
      return loadMatchData(db, conn, matchId, true);
    }
    console.error(
      `[footics] Data load failed after retry for match ${matchId}:`,
      err,
    );
    throw err;
  }

  // データがない場合はエラー
  throw new Error(
    `Match ${matchId} not found in local storage. Please use "Data Import" to add this match.`,
  );
}

/**
 * 旧構成 (footics_cache) のデータベースを削除・クリーンアップする
 */
export async function cleanupOldCache(): Promise<void> {
  const DB_NAME = 'footics_cache';
  return new Promise((resolve) => {
    console.log(`[footics] Cleaning up legacy database: ${DB_NAME}`);
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => {
      console.log(`[footics] Legacy database deleted: ${DB_NAME}`);
      resolve();
    };
    request.onerror = () => {
      console.warn(`[footics] Failed to delete legacy database: ${DB_NAME}`);
      resolve();
    };
  });
}

/**
 * カスタムイベントを DuckDB にロード
 */
export async function loadCustomEventsToDuckDB(
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
  matchId: string,
): Promise<void> {
  const customEvents = await getCustomEventsByMatch(matchId);
  // labels配列を label VARCHAR（" / " 結合）に変換して DuckDB に渡す
  const rows = customEvents.map((e) => ({
    ...e,
    label: Array.isArray(e.labels)
      ? e.labels.join(' / ')
      : ((e as any).label ?? ''),
  }));
  await db.registerFileText('custom_events.json', JSON.stringify(rows));
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
  const homeTeamName = info[2] || info[13] || 'Home';
  const awayTeamName = info[3] || info[14] || 'Away';
  const score = info[12] || info[8] || '0 : 0';
  const rawDate = info[4] || '';

  let date = '';
  if (rawDate) {
    const parts = rawDate.split(' ')[0].split('/');
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
        position: isFirstEleven ? 'FW' : 'Sub',
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
      venue_name: 'International Venue',
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      score: score,
      match_type: 'national',
    },
  ];

  const events: any[] = [];

  const metadata: MatchMetadata = {
    matchId: String(matchId),
    date: date,
    score: score,
    matchType: 'national',
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
  onProgress?: (current: number, total: number) => void,
): Promise<BatchImportResult> {
  const result: BatchImportResult = {
    total: files.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (onProgress) onProgress(i + 1, files.length);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as MatchRoot;
      const matchId = String(data.matchId);

      // 重複チェック (Unified DB)
      const existing = await getMatchBlobs(matchId);
      if (existing) {
        console.log(
          `[footics] Batch import: Skipping match ${matchId} (already exists)`,
        );
        result.skipped++;
        continue;
      }

      // インポート実行
      await importMatchJsonFileCore(data, db, conn);
      result.success++;
    } catch (err: any) {
      console.error(`[footics] Batch import failed for ${file.name}:`, err);
      result.failed++;
      result.errors.push({
        fileName: file.name,
        errorMessage: err.message || 'Unknown error',
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
): Promise<string> {
  const matchId = String(data.matchId);
  const start = performance.now();

  let matches: any[] = [];
  let players: any[] = [];
  let events: any[] = [];
  let metadata: MatchMetadata;

  if ('matchCentreData' in data) {
    const mc = data.matchCentreData;
    matches = [
      {
        match_id: data.matchId,
        start_time: mc.startTime,
        venue_name: mc.venueName,
        home_team_id: mc.home.teamId,
        away_team_id: mc.away.teamId,
        score: mc.score,
        match_type: 'club',
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

    const playerIdNameDictionary: Record<string, string> = {};

    if (mc.playerIdNameDictionary) {
      Object.keys(mc.playerIdNameDictionary).forEach((id) => {
        playerIdNameDictionary[String(id)] = mc.playerIdNameDictionary[id];
      });
    }

    [...mc.home.players, ...mc.away.players].forEach((p) => {
      const idStr = String(p.playerId);
      if (!playerIdNameDictionary[idStr]) {
        playerIdNameDictionary[idStr] = p.name;
      }
    });

    metadata = {
      matchId,
      date: mc.startTime ? mc.startTime.split('T')[0] : '',
      score: mc.score,
      matchType: 'club',
      playerIdNameDictionary,
      teams: { home: mc.home, away: mc.away },
    };
  } else if ('initialMatchDataForScrappers' in data) {
    const result = parseNationalMatchData(data);
    matches = result.matches;
    players = result.players;
    events = result.events;
    metadata = result.metadata;
  } else {
    throw new Error('Unknown JSON format.');
  }

  await db.registerFileText('matches.json', JSON.stringify(matches));
  await db.registerFileText('players.json', JSON.stringify(players));
  await db.registerFileText('events.json', JSON.stringify(events));

  await conn.query(`
    CREATE OR REPLACE TABLE matches AS SELECT * FROM read_json_auto('matches.json');
    CREATE OR REPLACE TABLE players AS SELECT * FROM read_json_auto('players.json');
    CREATE OR REPLACE TABLE events AS SELECT * FROM read_json_auto('events.json');
  `);

  await loadCustomEventsToDuckDB(db, conn, matchId);

  const [matchesParquet, playersParquet, eventsParquet] = await Promise.all([
    exportTableAsParquet(conn, db, 'matches'),
    exportTableAsParquet(conn, db, 'players'),
    exportTableAsParquet(conn, db, 'events'),
  ]);

  // Unified DB に保存 (Metadata と Blobs を同時に保存)
  const summary: MatchSummary = {
    id: metadata.matchId,
    homeTeam: {
      id: metadata.teams.home.teamId,
      name: metadata.teams.home.name,
    },
    awayTeam: {
      id: metadata.teams.away.teamId,
      name: metadata.teams.away.name,
    },
    date: metadata.date,
    score: metadata.score,
    matchType: metadata.matchType,
  };

  const blobs: MatchBlobEntry = {
    matchId,
    version: 1,
    matchesParquet,
    playersParquet,
    eventsParquet,
    metadata,
  };

  await saveMatchUnified(summary, blobs);

  // インポート直後は DuckDB テーブルがこの試合のもので上書きされているため、キャッシュを更新
  setCurrentlyLoadedMatchId(matchId);

  console.log(
    `[footics] Import ${matchId} done in ${(performance.now() - start).toFixed(0)}ms`,
  );
  return matchId;
}

/**
 * JSONファイルから直接マッチデータを読み込んでインポートする（単一ファイル用）
 */
export async function importMatchJsonFile(
  file: File,
  db: duckdb.AsyncDuckDB,
  conn: duckdb.AsyncDuckDBConnection,
): Promise<string> {
  const text = await file.text();
  const data = JSON.parse(text) as MatchRoot;
  return importMatchJsonFileCore(data, db, conn);
}
