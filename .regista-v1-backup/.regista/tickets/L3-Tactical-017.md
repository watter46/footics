---
id: L3-Tactical-017
title: Xメディア最適化比率セレクターUIとHUD・ツールバー連携
status: DONE
depends_on:
  - L2-Tactical-016
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx
  - src/components/features/tactical-unified/context-hud.tsx
---

# L3-Tactical-017: Xメディア最適化比率セレクターUIとHUD・ツールバー連携

## UX Impact
キャンバス上またはツールバーの境界線アイコンから、ワンクリックで「画像1枚(4:5)」「画像2枚カルーセル(9:16)」「動画(9:16)」「ピッチ全体横(16:9)」を直感的に切り替えられるようになります。

## Detailed Spec
1. `src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx` または境界線選択時の `context-hud.tsx` に、Xメディア最適化比率を選択できるポップオーバーメニューを追加。
2. チートシート完全訂正版に基づく主要4比率メニューを表示:
   - 📸 **画像1枚**: `4:5` (1080×1350px / TL最大高さ・Dwell Time最大化)
   - 🖼️ **画像2枚**: `9:16` (1080×1920px / 新カルーセル・スマホ全画面ジャック)
   - 🎬 **動画1本**: `9:16` (1080×1920px / おすすめ全画面縦フィード)
   - 🏟️ **ピッチ全体**: `16:9` (1200×675px / 22人俯瞰配置の絶対安全圏)
   - 🎯 **ピッチ白線フィット**: 標準境界線に戻す
3. 選択した比率に境界線が追従し、必要に応じて四隅ハンドルでの微調整もそのまま行えるようにする。

## Acceptance Criteria & Verification Commands
- [ ] ユーザーがUIからX最適化プリセット（4:5、9:16、16:9）を一発で境界線へ適用できること。
- [ ] 既存のキャンバス描画操作やエクスポートに干渉しないこと。

### Verification
`rtk biome check src/components/features/tactical-unified/toolbar/`
`pnpm type-check:scoped src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx`
