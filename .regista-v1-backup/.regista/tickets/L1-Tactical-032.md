---
id: L1-Tactical-032
title: export-modal.tsx の設定・プレビュー・エクスポート分割 (200行制限準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/export/export-modal.tsx
---

# L1-Tactical-032: export-modal.tsx の設定・プレビュー・エクスポート分割 (200行制限準拠)

## UX Impact
エクスポートモーダルの挙動を維持しつつ、動画・画像・JSONエクスポートの各ロジックとUIを整理する。

## Detailed Spec
1. `src/features/tactical-unified/components/export/export-modal.tsx` (1071行) をサブコンポーネントへ分割。
   - `export-image-tab.tsx`: 静止画（PNG/WebP/SVG）設定UI
   - `export-video-tab.tsx`: 動画（WebM/MP4/GIF）設定・エンコード進行UI
   - `export-json-tab.tsx`: Footics JSONインポート/エクスポートUI
   - `use-export-modal-state.ts`: モーダル内ローカル状態と書き出し処理Hook (150行以内)
2. `export-modal.tsx` はダイアログ骨組みとタブ切り替えのみを担当（150行以内）。

## Acceptance Criteria & Verification Commands
- [x] `export-modal.tsx` および各タブコンポーネントが200行以内であること
- [x] 静止画および動画のエクスポートが正常に実行できること

### Verification
`rtk biome check src/features/tactical-unified/components/export`
`pnpm type-check:scoped src/features/tactical-unified/components/export/export-modal.tsx`
