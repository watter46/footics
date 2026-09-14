---
id: L2-Tactical-021
title: Store層におけるアスペクト比即時変更と可変境界線ハイブリッド連動
status: DONE
depends_on:
  - L1-Tactical-019
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/stores/tactical-unified-store.ts
  - src/stores/slices/slide-slice.ts
---

# L2-Tactical-021: Store層におけるアスペクト比即時変更と可変境界線ハイブリッド連動

## UX Impact
アスペクト比（16:9 / 9:16 / 4:5 / 1:1）を選択すると、即座にキャンバス比率と境界線（Boundary Box）が対象比率の全画面（3%余白ピッチ外枠を含む全体）に同期変形し、かつユーザーが四方ハンドルで任意に可変調整（ドラッグリサイズ）できる。

## Detailed Spec
1. **Store アクションの更新 (`src/stores/tactical-unified-store.ts`)**:
   - `setAspectRatio(aspect: AspectRatio)`: `16:9`, `9:16`, `4:5`, `1:1` の4値を受け付けるように拡張。
   - アスペクト比変更時、自動的に境界線（Boundary Box）を対象比率のフル領域（`{ x: 0, y: 0, width: 100, height: 100 }`）へ即時リセット連動。
   - スライドごとの比率保持（`slide-slice.ts`）を更新。
2. **境界線（Boundary Box）の可変性維持**:
   - プリセット適用後もロックせず、従来の四方ポインタによるリサイズ・移動（`setBoundaryBox`）を通常通り可能にする。

## Acceptance Criteria & Verification Commands
- [ ] 4種のアスペクト比変更アクションで `project.aspectRatio` が正しく更新されること。
- [ ] アスペクト比切り替え時に境界線が即座に全体フィットに初期化され、その後の個別リサイズ操作も正常に動作すること。

### Verification
`rtk biome check src/stores/tactical-unified-store.ts`
`pnpm type-check:scoped src/stores/tactical-unified-store.ts`
`rtk vitest run src/stores/__tests__/tactical-unified-store.test.ts`
