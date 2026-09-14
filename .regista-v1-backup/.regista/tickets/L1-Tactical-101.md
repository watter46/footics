---
id: L1-Tactical-101
status: DONE
emoji: 🔧
title: tactical-unifiedストアとドラッグハンドラーの責務分離
depends_on: []
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/features/tactical-unified/stores/tactical-unified-store.ts
  - src/features/tactical-unified/components/canvas/player-drag-handler.ts
---

# 🔧 L1-Tactical-101: tactical-unifiedストアとドラッグハンドラーの責務分離

## UX Impact
動作の変更はありませんが、内部構造が整理され、今後の戦術ボードの描画や状態更新のパフォーマンスと保守性が向上します。

## Detailed Spec
1. `src/features/tactical-unified/stores/tactical-unified-store.ts` (1167行) を調査し、ZustandのStore定義と、データ変換・計算を行う純粋関数（Helper）を別ファイルに分離する。
2. `src/features/tactical-unified/components/canvas/player-drag-handler.ts` (606行) を調査し、行数制限（150行）に収まるようにロジックを複数のCustom Hookなどに分割する。
3. 循環参照が発生しないよう、Helper関数はStoreから値をインポートせず、引数で受け取る設計を徹底する。

## Acceptance Criteria & Verification Commands
- [x] tactical-unified-store.ts が状態定義のみに絞られ、純粋関数が別ファイル化されていること。
- [x] player-drag-handler.ts が適切に分割され、各ファイルが150行未満に収まっていること。
- [x] Type Check と Lint が通過すること。

### Verification
`rtk biome check src/features/tactical-unified`
`pnpm type-check:scoped src/features/tactical-unified/stores/tactical-unified-store.ts src/features/tactical-unified/components/canvas/player-drag-handler.ts`
