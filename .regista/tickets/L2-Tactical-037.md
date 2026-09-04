---
id: L2-Tactical-037
title: slide-slice.ts のスライドCRUD・アニメーション補間責務分割 (150行制限準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/features/tactical-unified/stores/slide-slice.ts
---

# L2-Tactical-037: slide-slice.ts のスライドCRUD・アニメーション補間責務分割 (150行制限準拠)

## UX Impact
タイムラインのスライド追加・複製・並び替えおよびスライド間アニメーション補間のデータ管理を高速化・安定化する。

## Detailed Spec
1. `src/features/tactical-unified/stores/slide-slice.ts` (1077行) を関心事ごとに分離。
   - `slide-crud-slice.ts`: スライドの追加・削除・複製・並び替え
   - `slide-playback-slice.ts`: 再生・一時停止・ループ・再生速度制御
   - `slide-transition-slice.ts`: スライド間遷移時間・イージング・補間計算
2. `slide-slice.ts` はこれらを合成して外部に提供。

## Acceptance Criteria & Verification Commands
- [ ] 分割スライスがそれぞれ関心事に分離され、保守しやすい行数になっていること
- [ ] タイムラインのスライド操作・アニメーション再生が問題なく動作すること

### Verification
`rtk biome check src/features/tactical-unified/stores`
`pnpm type-check:scoped src/features/tactical-unified/stores/slide-slice.ts`
