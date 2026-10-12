---
name: dexie
description: Dexie.js v4 (IndexedDB) を使用した Local-first アーキテクチャでの DB 操作ガイダンス
---

# Dexie.js v4 スキルガイド

Footics の Local-first アーキテクチャにおける SoT (Single Source of Truth) である Dexie.js の操作ガイドラインです。
実際の実装パターン（`src/lib/db` 配下）に基づいています。

## 1. マイグレーションとスキーマ定義 (Migrations)

`src/lib/db/schema.ts` でスキーマを変更する場合は、必ず `_DB_VERSION` をインクリメントし、新しい `.version(N)` ブロックを追加してください。

```typescript
// v21 の追加例
this.version(21).stores({
  new_table: 'id, matchId, updatedAt'
}).upgrade(async (tx) => {
  // データ移行が必要な場合
});
```

## 2. アトミックな更新とトランザクション (Transactions)

複数のテーブルを跨ぐ処理や一括更新は `db.transaction` を使用します。
イベントデータ等のバルク更新時は、重複を防ぐため「削除してから一括挿入」するパターン（`saveMatchUnified` 等）が Footics の標準です。

```typescript
// 'rw' (READWRITE) モードでのトランザクション
await db.transaction('rw', [db.matches, db.events], async () => {
  await db.matches.put(match);
  await db.events.where('match_id').equals(match.id).delete(); // 古いデータを削除
  await db.events.bulkPut(events); // 新しいデータを挿入
});
```
※ トランザクション内で Promise を catch しないこと（コミット/ロールバックの挙動に影響を与えます）。

## 3. リアクティブな更新 (`useLiveQuery`)

コンポーネント側で IndexedDB のデータをリアクティブに監視・描画するには、`dexie-react-hooks` の `useLiveQuery` を利用します。

```tsx
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";

export function EventList() {
  // 依存テーブルが変更されると自動で再フェッチ・再レンダリングされる
  const events = useLiveQuery(() => db.events.toArray(), []);
  
  if (!events) return <div>Loading...</div>;
  return <ul>{events.map(ev => <li key={ev.id}>{ev.name}</li>)}</ul>;
}
```

## 4. リアクティブな更新通知 (`dispatchRefreshEvent`) - Footics 固有ルール

Footics は Chrome 拡張や複数タブと連動するため、DB 更新後は（useLiveQuery外のシステムに通知するため）必ず `dispatchRefreshEvent` を呼び出して他クライアントへ更新を通知してください。

```typescript
import { dispatchRefreshEvent } from './extension-db-queries';

export async function putEventMemo(memo: EventMemo): Promise<void> {
  await db.event_memos.put(memo);
  dispatchRefreshEvent(memo.matchId); // 更新をブロードキャスト
}
```
