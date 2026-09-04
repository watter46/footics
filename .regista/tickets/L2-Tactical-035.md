---
id: L2-Tactical-035
title: use-canvas-pointer-interaction.ts のポインター計算責務分割 (150行制限準拠)
status: DONE
depends_on:
  - L1-Tactical-033
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/features/tactical-unified/components/canvas/use-canvas-pointer-interaction.ts
---

# L2-Tactical-035: use-canvas-pointer-interaction.ts のポインター計算責務分割 (150行制限準拠)

## UX Impact
キャンバス上のドラッグ、クリック、選択、描画ツールのポインター追従レスポンスを向上させる。

## Detailed Spec
1. `use-canvas-pointer-interaction.ts` (1017行) を単一責務のフック群へ分割。
   - `use-canvas-zoom-pan.ts`: ピッチ・キャンバスのズーム・パン計算Hook
   - `use-canvas-selection-box.ts`: 矩形複数選択（ラバーバンド選択）Hook
   - `use-canvas-drawing-interaction.ts`: ペン・矢印・ゾーンのドラッグ生成Hook
2. `use-canvas-pointer-interaction.ts` はポインターイベントのディスパッチと各フックの合成のみを担当（150行以内）。

## Acceptance Criteria & Verification Commands
- [x] 各フックが150行以内であること
- [x] ドラッグ、選択、ズーム、図形描画が正常に動作すること

### Verification
`rtk biome check src/features/tactical-unified/components/canvas`
`pnpm type-check:scoped src/features/tactical-unified/components/canvas/use-canvas-pointer-interaction.ts`
