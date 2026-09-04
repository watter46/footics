---
id: L1-Tactical-024
title: 境界線の平行ドラッグ移動対応とキャンバス外枠余白(24px)の確保
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/canvas/boundary-box.tsx
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
---

# L1-Tactical-024: 境界線の平行ドラッグ移動対応とキャンバス外枠余白(24px)の確保

## UX Impact
境界線（キャプチャ枠）の内側をつかんで形状を保ったまま自由に平行移動できるようになり、さらにキャンバス最大化時でも周囲に余白が確保されるため端での操作性が大幅に向上します。

## Detailed Spec
1. `src/components/features/tactical-unified/canvas/unified-canvas.tsx`:
   - Stageコンテナ計算時に外枠余白（上下左右24pxパディング）を差し引いた有効領域でStageサイズを計算。
2. `src/components/features/tactical-unified/canvas/boundary-box.tsx`:
   - 境界線外枠（Rect）またはドラッグ用透明ヒットエリアを `draggable` 化。
   - `onDragMove` ハンドラを追加し、幅・高さを保ったまま `x, y` を更新して `onUpdate` に渡す。
   - コーナーハンドルのリサイズ操作と全体のドラッグ移動が干渉しないようイベントバブリングを制御。

## Acceptance Criteria & Verification Commands
- [ ] 境界線の枠内をドラッグして位置（x, y）を平行移動できること
- [ ] 四隅のハンドルでサイズ変更できる既存動作が阻害されないこと
- [ ] キャンバス外枠と境界線の間に余白（24px）が存在し、ハンドルが画面端で見切れないこと

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/boundary-box.tsx src/components/features/tactical-unified/canvas/unified-canvas.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/boundary-box.tsx src/components/features/tactical-unified/canvas/unified-canvas.tsx`
