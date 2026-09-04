---
id: L2-Tactical-029
title: 全画面キャンバス上でのピッチ中央配置(レターボックス)と各レイヤーのGroup統合
status: DONE
depends_on:
  - L1-Tactical-025
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/components/features/tactical-unified/canvas/pitch-background.tsx
  - src/components/features/tactical-unified/canvas/boundary-box.tsx
---

# L2-Tactical-029: 全画面キャンバス上でのピッチ中央配置(レターボックス)と各レイヤーのGroup統合

## UX Impact
ウィンドウサイズやアスペクト比に関係なくキャンバス作業領域が画面一杯に最大化され、ピッチは指定アスペクト比を維持して中央に配置（余白あり）されます。境界線はピッチの枠を超えてキャンバス余白全体へ自由にはみ出し移動・リサイズできるようになります。

## Detailed Spec
1. `src/components/features/tactical-unified/canvas/unified-canvas.tsx`:
   - `stageSize` をコンテナ要素の最大実サイズ（`{ width, height }`）に設定し、アスペクト比による Stage 自体の縮小・クリッピングを撤廃。
   - コンテナサイズと現在のアスペクト比から中央に収まるピッチの幾何矩形（`pitchRect = { x, y, width, height }`）を算出。
   - ピッチ背景、アノテーション、選手、ボール等のピッチ内要素レイヤーを `<Group x={pitchRect.x} y={pitchRect.y}>` でラップし、各レイヤーへの基準サイズとして `pitchRect` の `{ width, height }` を渡す。
   - `BoundaryBox`（境界線）は `Stage` 直下の UI レイヤーに配置し、ピッチ外枠やキャンバス全体に渡って自由に移動・リサイズ可能にする。
2. `src/components/features/tactical-unified/canvas/pitch-background.tsx`:
   - ピッチ背景描画が親 Group（中央ピッチ矩形）の幅・高さに忠実に描画されるよう調整。

## Acceptance Criteria & Verification Commands
- [ ] 画面をリサイズしても Stage（キャンバス）がコンテナ全画面を占有すること
- [ ] 指定されたアスペクト比のピッチがキャンバス中央に正しい比率で配置されること
- [ ] 選手、アノテーション、ボールの正規化座標がピッチ基準で正しく動作し、ズレが生じないこと
- [ ] 境界線がピッチ領域をはみ出してキャンバスの端まで自由にドラッグ＆リサイズできること

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/unified-canvas.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/unified-canvas.tsx`
`rtk vitest run src/components/features/tactical-unified/toolbar/__tests__/boundary-box-hud.test.tsx`
