---
id: L2-Tactical-020
title: ピッチ背景コンポーネント(pitch-background)の4種アスペクト比対応と真円SVG描画
status: DONE
depends_on:
  - L1-Tactical-019
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/canvas/pitch-background.tsx
  - src/app/test/pitch-aspect/components/pitch-stage.tsx
---

# L2-Tactical-020: ピッチ背景コンポーネント(pitch-background)の4種アスペクト比対応と真円SVG描画

## UX Impact
Tacticalキャンバスのピッチ背景が `16:9`, `9:16`, `4:5`, `1:1` の各比率に美しくフィットし、余白3%でセンターサークルが完全な真円を保った状態で滑らかにトランジション表示される。

## Detailed Spec
1. **ピッチ背景コンポーネントの刷新 (`src/components/features/tactical-unified/canvas/pitch-background.tsx`)**:
   - `aspectRatio` プロパティ（`16:9`, `9:16`, `4:5`, `1:1`）に対応。
   - `/test/pitch-aspect` で検証済みのレスポンシブSVG描画（幾何計算に基づくタッチライン最大化＆等方サークル描画）を導入。
   - デフォルト余白3%を適用。
2. **トランジションアニメーション**:
   - アスペクト比切り替え時にピッチ外枠やラインが破綻なくスムーズに追従・リサイズされる構造を担保。

## Acceptance Criteria & Verification Commands
- [ ] `16:9`, `9:16`, `4:5`, `1:1` のいずれが渡されても、エラーなくピッチSVGが描画されること。
- [ ] センターサークルが楕円化せず、歪みのない真円を維持していること。

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/pitch-background.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/pitch-background.tsx`
