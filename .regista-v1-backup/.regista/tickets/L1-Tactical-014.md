---
id: L1-Tactical-014
title: X最適化プリセット型定義と境界線比率モデルの刷新
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/lib/types/tactical-unified.ts
---

# L1-Tactical-014: X最適化プリセット型定義と境界線比率モデルの刷新

## UX Impact
チートシート完全訂正版に基づき、静止画枠外UI前提（余白不要・枠内最大活用）で、4大比率（画像1枚 4:5、画像2枚カルーセル 9:16、動画 9:16、俯瞰 16:9）にピッチ境界線を即座に合わせる計算・型モデルが整備されます。

## Detailed Spec
1. `src/lib/types/tactical-unified.ts` の余計なセーフゾーン関連プロパティ（`showSafeZone` 等）を整理・削除し、シンプルな境界ボックスモデルを維持。
2. X（Twitter）完全訂正版チートシートに基づく主要4プリセット（`X_MEDIA_PRESETS`）に厳選・最適化:
   - `single_image_4_5`: 画像1枚 ➔ `4:5`（1080×1350px / 上下切断ゼロ・TL最大高さ・Dwell Time最大化）
   - `carousel_image_9_16`: 画像2枚 ➔ `9:16`（1080×1920px / 新カルーセル横スワイプ・画面完全ジャック）
   - `feed_video_9_16`: 動画1本 ➔ `9:16`（1080×1920px / おすすめ全画面縦フィード）
   - `pitch_overview_16_9`: ピッチ全体横画像 ➔ `16:9`（1200×675px / 22人配置・ピッチ俯瞰の絶対安全圏）
3. `createXBoundaryBox(ratio, canvasAspect)` を更新し、キャンバス全体（横16:9 / 縦9:16）の中で指定比率の境界線枠をピッチ中央に最大サイズで配置する正規化座標を計算する。

## Acceptance Criteria & Verification Commands
- [ ] X完全訂正版チートシート準拠の主要4プリセット定数が整理・定義されていること。
- [ ] 不要なセーフゾーン定義を排除し、型定義がクリーンであること。
- [ ] `createXBoundaryBox` が各比率（4:5, 9:16, 16:9）を正確な正規化座標で中央生成すること。

### Verification
`rtk biome check src/lib/types/tactical-unified.ts`
`pnpm type-check:scoped src/lib/types/tactical-unified.ts`
