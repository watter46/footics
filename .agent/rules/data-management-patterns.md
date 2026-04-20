---
trigger: always_on
globs: ["src/hooks/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"]
---

# Data Management Patterns (データ管理パターン)

**Activation:** This rule is **ALWAYS ON** for files matching `src/hooks/**/*.{ts,tsx}` and `src/lib/**/*.{ts,tsx}`.

DuckDB-WASM, IndexedDB, and TanStack Query を組み合わせた、型安全で高性能なデータライフサイクル管理の規約を定めます。

## 1. DuckDB & Persistence Strategy (永続化)

- **Singleton パターン:** `AsyncDuckDB` は `globalThis` を用いた Singleton で管理し、二重初期化を防止する。
- **VFS リソース管理:** `db.registerFileBuffer` 等で登録したファイルは、テーブルへの読み込み完了後、直ちに `db.dropFile()` で解放する。
- **Parquet 形式の優先:** データの永続化には JSON ではなく Parquet 形式を使用し、IndexedDB に保存・復旧する。

## 2. IndexedDB (`idb`) Strategy

- **レイヤー分離:** `openDB` の直接呼び出しを避け、`src/lib/db.ts` などの統一レイヤーを介する。
- **トランザクション:** 複数ストアへの書き込みには明示的なトランザクションを使用し、`await tx.done` で完了を保証する。
- **idb-keyval:** スキーマ不要な単純な設定値やフラグには `idb-keyval` を活用する。

## 3. TanStack Query v5 Integration

- **Query Key Factory:** キーは文字列の直書きを避け、`src/lib/query-keys.ts` 等で一元管理する（階層構造を推奨）。
- **DuckDB 連携:** `queryFn` 内で DuckDB インスタンスを解決し、クエリを実行する。重い処理には適切な `staleTime` を設定する。
- **Suspense の活用:** `useSuspenseQuery` を積極的に使用し、宣言的なローディング状態を実現する。
- **Mutation & Invalidation:** 更新後は `invalidateQueries` を呼び出し、UI を最新の状態に保つ。

## 4. Hooks & Data Flow

- **カスタムフック化:** データ取得ロジックはコンポーネントに直接書かず、`useMatchList` 等の専用フックにカプセル化する。
- **キャンセル処理:** アンマウント時にクエリをキャンセルできるよう、`AbortController` 等を適切に処理する。
