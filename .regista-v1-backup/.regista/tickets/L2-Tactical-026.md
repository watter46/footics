---
id: L2-Tactical-026
title: 境界線固定でのピッチ単体ズーム・パン(ドラッグ移動)およびロック連動
status: DONE
depends_on: ["L1-Tactical-025"]
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/components/features/tactical-unified/canvas/hooks/use-canvas-interaction.ts
---

# L2-Tactical-026: 境界線固定でのピッチ単体ズーム・パン(ドラッグ移動)およびロック連動

## UX Impact
境界線（エクスポート枠）は固定されたまま、ホイールによるズームおよびドラッグによるパン移動がピッチ（背景＋選手＋アノテーション群）に対してのみ適用され、ピッチがロックされている場合は安全に描画・選択が可能になります。

## Detailed Spec
1. `src/components/features/tactical-unified/canvas/unified-canvas.tsx`:
   - 背景レイヤー、アノテーションレイヤー、選手/ボールレイヤーを包含するピッチ専用のKonva `Group`（または各Layer共通Transform）を構成。
   - 境界線（`BoundaryBox`）はスクリーン空間に固定（ピッチのズーム/パンの影響を受けない）。
2. `use-canvas-interaction.ts`:
   - マウスホイールによるズーム処理をピッチTransform（`zoom`）に連動。
   - ピッチがアンロック状態（またはスペースキー押下時）の背景ドラッグでピッチの `panX, panY` を更新。
   - ピッチがロックされている状態では背景ドラッグでMarquee選択等の既存操作が動作。

## Acceptance Criteria & Verification Commands
- [ ] ホイールでピッチ（背景・選手・アノテーション）のみが拡大縮小され、境界線枠は拡大縮小されないこと
- [ ] ピッチのロック解除時、ピッチをドラッグして位置を移動できること
- [ ] ピッチのロック時、ピッチが動かず通常通りの矩形選択やツール操作が行えること

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/unified-canvas.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/unified-canvas.tsx`
