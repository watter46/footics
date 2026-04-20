import type * as duckdb from '@duckdb/duckdb-wasm';

/**
 * メモリ上のテーブルを VFS 上の Parquet ファイルとして書き出し、ArrayBuffer として返す
 */
export async function exportTableAsParquet(
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

/**
 * Parquet バッファを読み込んで DuckDB のテーブルを作成する
 */
export async function importParquetAsTable(
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
