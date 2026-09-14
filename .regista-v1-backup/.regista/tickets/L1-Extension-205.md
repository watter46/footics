---
id: L1-Extension-205
emoji: 🏷️
title: メモオーバーレイ タグクイック選択UI (数字キーショートカット)
status: DONE
depends_on: ["L1-Extension-204"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - extension/features/memo-overlay/components/overlay-app.tsx
  - extension/features/memo-overlay/hooks/use-overlay-shortcut-interceptor.ts
  - extension/features/memo-overlay/memo-overlay-bridge.tsx
  - extension/features/memo-overlay/stores/use-overlay-store.ts
---

# 🏷️ L1-Extension-205: メモオーバーレイ タグクイック選択UI (数字キーショートカット)

## UX Impact
「ビルドアップ」「プレス」「トランジション」「セットプレー」などの戦術カテゴリを数字キー (1〜4) で瞬時にタグ付け可能になり、動画視聴中の素早いメモ入力を実現する。

## Detailed Spec
1. `extension/constants/quick-tags.ts` を新規作成：プリセットタグリスト（ビルドアップ・プレス・トランジション・セットプレー等）を `QUICK_TAGS: { key: string; label: string; shortcut: string }[]` として定義。
2. EVENT モードの `MemoOverlayView` の上部に、タグクイック選択バーコンポーネント `QuickTagBar.tsx`（`extension/features/memo-overlay/components/`内）を追加。各タグボタンを横並びで表示し、数字キーのショートカット (`1`〜`4`) ラベルを添える。
3. `use-overlay-shortcut-interceptor.ts` に数字キー (`1`〜`4`) の keydown ハンドラを追加：オーバーレイ表示中かつ EVENT モード時に対応するプリセットタグを `setSelectedLabels` へ即時適用するロジックを実装。既存の `hotkeys-js` を活用。

## Acceptance Criteria & Verification Commands
- [x] EVENT モードでオーバーレイ表示中に数字キー 1〜4 でタグが選択されること
- [x] `QuickTagBar` にプリセットタグが横並びで表示されること
- [x] 選択中のタグがハイライト（amber系）で視覚的に識別できること
- [x] `QUICK_TAGS` 定数が `extension/constants/` に分離定義されていること

### Verification
```
rtk biome check extension/features/memo-overlay/
rtk biome check extension/constants/
rtk pnpm --filter footics-extension type-check
```
