---
id: L1-Extension-202
emoji: 🗄️
title: IndexedDB (Dexie.js) 一次保存 & オフライン同期層の整備
status: TODO
depends_on: ["L1-Extension-201"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - extension/features/storage-sync/save-queue.ts
  - extension/features/storage-sync/cache-sync.ts
  - extension/entrypoints/content.ts
  - extension/constants/index.ts
---

# 🗄️ L1-Extension-202: IndexedDB (Dexie.js) 一次保存 & オフライン同期層の整備

## UX Impact
Footics本体タブが閉じている状態や、ネットワーク切断中でもキャプチャ・メモを安全にローカル保存し、タブが開いた際に自動で一括同期されるようになる。

## Detailed Spec
1. `extension/features/storage-sync/offline-queue.ts` を新規作成する。`browser.storage.local` のキューがFlushされる前に、拡張固有の Dexie.js DB (`FooticsOfflineDB`) へキャプチャペイロードと保存リクエストを一次書き込みするロジックを実装。スキーマは `TacticalCapturePayload` と `SaveQueueItem` をベースに Zod で型定義する。
2. `content.ts` の `browser.tabs.onUpdated` / `browser.tabs.onActivated` (Footics App URL検出) をトリガーに、`offline-queue.ts` の未同期レコードを `processSaveQueue` ロジックへ流し込むリカバリー関数 `replayOfflineQueue()` を実装。
3. STORAGE_KEYS に `OFFLINE_QUEUE` キーを追加し、既存の `SAVE_QUEUE` と分離管理する（責務の明確化）。

## Acceptance Criteria & Verification Commands
- [ ] `FooticsOfflineDB` が Dexie.js で定義され、型安全にアクセスできること
- [ ] Footics App タブが開かれた際に未同期データが自動リプレイされること
- [ ] `OFFLINE_QUEUE` と `SAVE_QUEUE` のキーが別管理されていること

### Verification
```
rtk biome check extension/features/storage-sync/
rtk pnpm --filter footics-extension type-check
```
