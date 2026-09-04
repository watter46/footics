---
id: L2-Tactical-027
title: ピッチオブジェクトの自由ドラッグ移動対応
status: DONE
depends_on:
  - L1-Tactical-025
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/pitch-background.tsx
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/stores/slices/slide-slice.ts
---

# L2-Tactical-027: ピッチオブジェクトの自由ドラッグ移動対応

## UX Impact
ピッチ自体をキャンバス上の自由な位置へ掴んで平行移動できるようになり、構図や作業スペースの柔軟なレイアウト調整が可能になります。

## Detailed Spec
1. `tactical-unified.ts` & `slide-slice.ts`:
   - スライド状態に `pitchPosition?: { x: number; y: number }`（正規化またはオフセット座標）を追加し、更新アクションを定義。
2. `pitch-background.tsx`:
   - ピッチ要素（背景矩形およびSVGピッチ）を Konva `<Group>` 化し、ドラッグイベント（`draggable`）に対応。
   - 変更後の位置をストアに保存・同期。
3. `unified-canvas.tsx`:
   - 境界線の `AutoFitPitch` 実行時、移動後のピッチ位置に追従して境界線がフィットするように連携。

## Acceptance Criteria & Verification Commands
- [ ] ピッチをドラッグしてキャンバス上の任意の位置へ動かせること
- [ ] スライド切り替えや再描画時もピッチ位置が保持されること

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/pitch-background.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/pitch-background.tsx`
