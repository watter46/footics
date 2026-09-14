---
id: L1-Tactical-025
title: 境界線とキャンバスの余白制約撤廃および4:5初期値対応
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/boundary-box.tsx
  - src/lib/types/tactical-unified.ts
  - src/stores/tactical-unified-store.ts
---

# L1-Tactical-025: 境界線とキャンバスの余白制約撤廃および4:5初期値対応

## UX Impact
キャンバスの最大作業領域を維持したまま、境界線をキャンバス端を越えて自由にドラッグ・リサイズできるようになり、デフォルトで4:5比率（ピッチフィット・上下3%余白）で整然と初期配置されます。

## Detailed Spec
1. `boundary-box.tsx`:
   - `CANVAS_MARGIN = 24` による移動・リサイズのクランプ処理（`Math.max(margin, ...)` 等）を撤廃し、キャンバス領域外への自由な移動・リサイズを許容する。
2. `tactical-unified.ts`:
   - デフォルトアスペクト比を `4:5` に設定。
   - `DEFAULT_BOUNDARY_BOX_4_5` をピッチフィット（上下3%マージン）の初期値として定義し、`getDefaultBoundaryBoxForAspect` に `4:5` を追加。
3. `tactical-unified-store.ts`:
   - スライド生成時・初期化時のデフォルト比率・境界線設定を `4:5` 基準に更新。

## Acceptance Criteria & Verification Commands
- [ ] 境界線がキャンバス端（24px制限なし）を超えて自由にはみ出しドラッグ・リサイズできること
- [ ] 初期ロード時および新規スライド作成時に比率4:5・ピッチフィット状態で境界線が配置されること
- [ ] 既存の枠線ドラッグおよび4隅ハンドルの追従動作が維持されていること

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/boundary-box.tsx src/lib/types/tactical-unified.ts src/stores/tactical-unified-store.ts`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/boundary-box.tsx src/lib/types/tactical-unified.ts src/stores/tactical-unified-store.ts`
`rtk vitest run src/stores/tactical-unified-store.test.ts`
