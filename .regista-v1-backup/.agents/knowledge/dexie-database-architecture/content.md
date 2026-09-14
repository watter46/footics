# Dexie Database Architecture & Module Guidelines (Dexie DB 設計とモジュール構成規約)

## 概要
クライアントサイドのローカルデータ永続化には **Dexie.js 4.x** を統一して採用しています。`src/lib/db/` 配下を役割ごとに明確に分割し、保守性・型安全性・同期整合性を担保します。

---

## 1. `src/lib/db/` モジュール構成

`src/lib/db/` は単一の肥大化したファイルを避け、以下の責務に分割しています。

| ファイル | 役割・責務 |
| :--- | :--- |
| `schema.ts` | `FooticsDatabase` クラス定義、バージョン・インデックス定義、テーブル型定義、マイグレーション (`upgrade`) 処理、`db` シングルトンインスタンスのエクスポート |
| `queries.ts` | CRUD 関数群（`getEventMemosByMatch`, `saveCustomEvent` など）、データ更新通知ヘルパー (`dispatchRefreshEvent`) |
| `export.ts` | バックアップ・全データの一括エクスポート処理 (`exportAllData` 等) |
| `index.ts` | モジュールの公開 API を集約して再エクスポート |

---

## 2. Dexie 利用・設計方針

### 2.1 複合主キーによる衝突回避
- 試合を跨ぐイベントデータの衝突を防ぐため、`events` テーブルの主キーには `[match_id+id]` の複合主キー（Compound Key）を採用しています。
- 選手マスターテーブル `players` では、シーズン跨ぎの同選手登録およびシーズン別スカッド切り替えを可能にするため、主キーに `id` (`${season}_${playerId}`) を採用しています。
- 検索クエリでは `match_id` や `team_id`, `type_value`, `period`, `season` などのセカンダリインデックスを活用します。

### 2.2 スキーマバージョニングとデータマイグレーション
- テーブル構造の追加・変更時は、必ず `schema.ts` 内の `this.version(N).stores(...)` をインクリメントします。
- 既存データの加工・デフォルト値補完が必要な場合は、`.upgrade(async (tx) => { ... })` ハンドラ内でアトミックに実行します。
- v18では `players` テーブルの構造変更（シーズン属性追加）に伴い、既存データをクリアした上でシーズン付きマスターとして再構築します。

### 2.3 トランザクションとアトミック性
- 複数テーブルに跨る保存や一括更新処理は、`db.transaction('rw', [db.table1, db.table2], async () => { ... })` を使用してアトミック性を保証します。

### 2.4 クエリ実行とデータ同期の責務
- コンポーネントや Zustand ストアから Dexie の `db` インスタンスを直接叩いての更新は禁止します。
- 必ず `queries.ts` のヘルパー関数を経由し、更新処理直後に `dispatchRefreshEvent(matchId)` が実行されることを保証してください。
