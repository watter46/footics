---
trigger: always_on
globs: ["**/*.{ts,tsx,json}"]
---

---
trigger: always_on
globs: ["**/*.{ts,tsx,json}"]
---

# DuckDB / IndexedDB Best Practices (データベース・ストレージ戦略)

**Activation:** This rule is **ALWAYS ON** for files matching `**/*.{ts,tsx,json}`.

DuckDB-WASM と IndexedDB (`idb`, `idb-keyval`) を組み合わせたデータの読み込み、加工、永続化に関するベストプラクティスを定めます。

## DuckDB-WASM 戦略

- **初期化と Singleton パターン:**
  - `AsyncDuckDB` インスタンスは非常に重いため、必ず **Singleton パターン** を使用してください。
  - HMR (Hot Module Replacement) 時の二重初期化を防ぐため、`globalThis` (例: `globalThis.__footics_duckdb_instance`) に Promise を保持してください。
  - Worker の Blob URL は、`Worker` 作成直後に `URL.revokeObjectURL()` で解放し、メモリリークを防止してください。
- **リソース管理 (VFS):**
  - `db.registerFileBuffer` や `db.registerFileText` で VFS (Virtual File System) にファイルを登録した後は、テーブル（`CREATE TABLE ... AS SELECT ...`）への読み込みが完了次第、直ちに `db.dropFile()` でファイルを解放してください。
- **永続化戦略 (Parquet):**
  - DuckDB テーブルの永続化には、JSON ではなく **Parquet 形式** を優先してください。
  - **エクスポート:** `COPY (SELECT * FROM table) TO 'file.parquet' (FORMAT PARQUET)` を実行し、`db.copyFileToBuffer` で取得します。
  - **インポート:** 取得したバイナリを VFS に登録後、`read_parquet('file.parquet')` を用いてテーブルを復元します。
  - これにより、大量のデータも高速かつ省サイズで IndexedDB に保存・復旧できます。
- **データ型管理:**
  - `read_json_auto` 等を使用する際は、型推論に頼りすぎず、必要に応じてスキーマを明示的に指定してください。

## IndexedDB (`idb`) 戦略

- **レイヤー構成:**
  - `openDB` の直接呼び出しは避け、統一されたデータベースレイヤー（例: `src/lib/db.ts`）を介して操作してください。
- **スキーマ管理:**
  - データベースの `upgrade` コールバック内で、`objectStore` や `index` の作成を適切に行ってください。
  - 既存のストアやインデックスがあるか `contains()` で確認する防御的なコードを記述してください。
- **トランザクション:**
  - 複数のストアへの書き込みや、アトミック性が求められる操作（例: Meta情報とParquetバイナリの同時保存）には、明示的なトランザクション（`db.transaction(['store1', 'store2'], 'readwrite')`）を使用してください。
  - 書き込み完了は必ず `await tx.done` で保証してください。
- **検索の最適化:**
  - 特定の属性（例: `matchId`）での検索が頻繁な場合は、明示的に `Index` を作成し、`getAllFromIndex` 等を活用してください。

## idb-keyval 戦略

- **使い分け:**
  - スキーマ定義やインデックスが必要ない、単純な設定値やフラグ、単一の大きな Blob の保存には `idb-keyval` を活用してください。
- **名前空間:**
  - 他のモジュールとの競合を避けるため、キー名には適切なプレフィックス（例: `settings:theme`, `ui:sidebar_open`）を付与することを推奨します。

## React 統合

- **状態管理:**
  - DuckDB の接続状態やデータロード状態は、カスタム Hook (例: `useDuckDB`) や TanStack Query と統合して管理してください。
  - コンポーネントのアンマウント時にクエリをキャンセルできるよう、`cancelled` フラグや `AbortController` を適切に処理してください。