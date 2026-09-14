# TanStack Query Cache Structure (キャッシュ構造とキー管理)

## 概要
データ取得レイヤーにおける TanStack Query のキー管理戦略と、IndexedDB (Dexie) との連携に関するアーキテクチャ制約です。

## 厳守すべき制約 (Constraints)

1. **クエリキーのファクトリパターン**
   - コンポーネントやカスタムフック内でクエリキーを直接文字列としてハードコードしないでください（例: `useQuery({ queryKey: ['matches', id] })` は禁止）。
   - 必ず `src/lib/query-keys.ts` に定義されたファクトリオブジェクト（例: `matchKeys.detail(id)`）を使用して、階層化されたキーを生成してください。

2. **キーの階層構造と無効化 (Invalidation)**
   - キーは必ず配列で定義され、階層構造を持ちます。
   - 例: `matchKeys`
     - `all`: `['matches']`
     - `lists`: `['matches', 'list']`
     - `detail(id)`: `['matches', 'detail', id]`
   - `footics-action` イベントなどでデータを無効化 (Invalidate) する際は、更新対象の最小の粒度のキーを指定するか、全体を更新する場合は `all` キーを利用して一括無効化を行います。

3. **DB操作との分離**
   - 実際のデータの永続化やトランザクション処理は `src/lib/db.ts` で行われます。
   - `useQuery` / `useSuspenseQuery` 内の `queryFn` は、`db.ts` で定義された Read 用の関数を呼び出すだけの薄いラッパーとして機能させます。
