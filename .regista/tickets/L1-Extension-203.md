---
id: L1-Extension-203
emoji: 🔗
title: SidepanelView の双方向同期 (save-queue & IndexedDB 連携)
status: DONE
depends_on: ["L1-Extension-201", "L1-Extension-202"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - extension/features/sidepanel/components/sidepanel-view.tsx
  - extension/features/sidepanel/stores/use-sidepanel-store.ts
  - extension/features/sidepanel/index.ts
  - extension/features/storage-sync/save-queue.ts
  - extension/entrypoints/sidepanel/
---

# 🔗 L1-Extension-203: SidepanelView の双方向同期 (save-queue & IndexedDB 連携)

## UX Impact
サイドパネルで入力したメモが `Ctrl+Enter` で確実に Footics 本体の IndexedDB へ保存され、双方向に反映されるようになる。現状は閉じるだけで保存されない。

## Detailed Spec
1. `use-sidepanel-store.ts` を拡張：`matchId: string | undefined`、`isSaving: boolean`、`save()` アクションを追加。`save()` は `addToSaveQueue` を呼び出し、完了時に `reset()` + トースト表示。
2. `SidepanelView.tsx` を更新：`Ctrl+Enter` で `save()` を呼び出し保存、保存完了トースト（`SuccessToast` コンポーネントを流用）を表示する。現在の match ID は `browser.storage.local.get(STORAGE_KEYS.LAST_ACTIVE_MATCH_ID)` から取得してストアへ注入する。
3. `use-sidepanel-store.ts` にストア初期化 `useEffect`：サイドパネルロード時に `storage.local` から最新の matchId を読み込み、`storage.onChanged` で変化に追従する。

## Acceptance Criteria & Verification Commands
- [ ] `Ctrl+Enter` でメモが save-queue に追加されること
- [ ] 保存完了時にサイドパネル内でトーストが表示されること
- [ ] `matchId` が未設定の場合に適切なエラーメッセージが表示されること
- [ ] サイドパネル開時に最新の matchId が自動ロードされること

### Verification
```
rtk biome check extension/features/sidepanel/
rtk pnpm --filter footics-extension type-check
```
