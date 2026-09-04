---
id: L1-Tactical-026
title: BoundaryBoxHudの機能拡張(4:5比率・AutoFitPitch・AutoFitCanvas)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx
  - src/stores/tactical-unified-store.ts
---

# L1-Tactical-026: BoundaryBoxHudの機能拡張(4:5比率・AutoFitPitch・AutoFitCanvas)

## UX Impact
境界線HUDから「4:5」比率の選択や、ピッチ外枠へのワンタッチ吸着（AutoFitPitch）、キャンバス全画面へのフィット（AutoFitCanvas）を即座に実行できるようになります。

## Detailed Spec
1. `boundary-box-hud.tsx`:
   - アスペクト比ボタングループに `4:5` を追加。
   - `AutoFitPitch` ボタンを追加し、現在のピッチ領域（上下3%余白のピッチ外枠）に境界線の位置とサイズを一括スナップするアクションを実装。
   - `AutofitCanvas` ボタン（従来の全画面化）の名称・挙動を統一。
2. `tactical-unified-store.ts`:
   - ピッチフィット用の境界線計算またはアクションヘルパーを整備。

## Acceptance Criteria & Verification Commands
- [ ] HUD上に `16:9`, `9:16`, `4:5`, `1:1`, `AutoFitPitch`, `AutofitCanvas` の各操作が揃っていること
- [ ] 各ボタンクリック時に境界線が意図した比率・位置に即座に同期されること

### Verification
`rtk biome check src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx`
