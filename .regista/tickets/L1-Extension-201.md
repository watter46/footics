---
id: L1-Extension-201
emoji: 🔄
title: save-queue のリトライ & エラーリカバリー強化
status: TODO
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - extension/features/storage-sync/save-queue.ts
  - extension/features/storage-sync/cache-sync.ts
  - extension/types/schemas.ts
---

# 🔄 L1-Extension-201: save-queue のリトライ & エラーリカバリー強化

## UX Impact
IndexedDB 書き込みエラー発生時も自動リトライによりメモが失われなくなる。エラー状態のアイテムが永遠にキューに残り続ける問題を解消する。

## Detailed Spec
1. `SaveQueueItem` スキーマに `retryCount: number` と `errorMessage?: string` フィールドを追加（Zodスキーマ更新）。
2. `processSaveQueue` のエラーハンドリングを拡張：`status: 'error'` 時に `retryCount < 3` であればキューに残し `retryCount++`、3回失敗したら `status: 'failed'` として最終的に除去 + `console.error` で記録。
3. Content Script の `storage.onChanged` リスナーにデバウンス（300ms）を追加し、`processSaveQueue` の多重呼び出し競合を防止。

## Acceptance Criteria & Verification Commands
- [ ] `SaveQueueItemSchema` に `retryCount` フィールドが追加されていること
- [ ] IndexedDB書き込みエラー時に最大3回まで自動リトライすること
- [ ] 3回失敗した `failed` アイテムはキューから除去されること
- [ ] デバウンス処理で `processSaveQueue` の多重呼び出しが抑制されること

### Verification
```
rtk biome check extension/features/storage-sync/
rtk biome check extension/types/
rtk pnpm --filter footics-extension type-check
rtk vitest run extension/features/capture/__tests__/
```
