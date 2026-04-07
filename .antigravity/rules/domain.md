# Footics Domain & Data Architecture Rules

## Data Layer (Single Source of Truth)
- `src/lib/schema.ts` の Zod 定義が唯一の絶対的な真実（Single Source of Truth）。DB保存・ZIP入出力時は必ずバリデーションを通す。
- 永続化が必要な場合は LocalStorage を使用せず、必ず `IndexedDB` (`idb` または `idb-keyval`) を使用すること。
- 重いデータ処理や解析は Web Workers または DuckDB-Wasm を利用すること。

## Data Hybridization
- サーバーからの静的データ (`serverMatches`) と IndexedDB のユーザーデータ (`idbMatches`) をマージする際は、**必ず IndexedDB の変更を優先**させる。
- 映像連携に関わるデータには `videoTimestamp` フィールドを利用・参照する。

## Coordinate System (Critical)
- **Data Layer (保存データ)**: 常に**「ホームチームの守備側を0（左端）」** とする絶対座標 (0-100)。
- **View Layer**: 表示時は必ず `toViewPos` などの変換関数を通し、`isFlipped` フラグに基づきアウェイ視点（180度反転）への制御を行う。
- フォーメーション等では `getFormationActualPos` を使用しての座標変換を厳守する。
