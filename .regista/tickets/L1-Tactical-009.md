---
id: L1-Tactical-009
title: annotation-layer.tsx のモジュール分割（1266行→矢印・ゾーン・テキスト描画の独立分離）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/annotation-layer.tsx
---

# L1-Tactical-009: annotation-layer.tsx のモジュール分割（1266行→矢印・ゾーン・テキスト描画の独立分離）

## UX Impact
1,266行のアノテーションレイヤーを各図形種別ごとに分離し、波線矢印やインラインテキスト編集などの頻繁な追加・修正時のトークン消費と保守負荷を解消する。

## Detailed Spec
`src/components/features/tactical-unified/canvas/annotations/` 等に分離：
1. `arrow-object.tsx`: 実線・点線・波線矢印の描画・制御ハンドル（ベジェ／正弦波幾何計算含む）
2. `zone-object.tsx`: 四角形・円形・多角形フリーゾーンの描画・頂点ハンドル・カスタム回転
3. `text-object.tsx`: ピッチ上テキスト描画
4. `wavy-arrow-math.ts`: 波線生成ヘルパー (`getWavyPoints` 等の純粋計算関数)
5. `annotation-layer.tsx`: 統合レイヤー（100行以下）

## Acceptance Criteria & Verification Commands
- [ ] 矢印のカーブ操作・波線描画、ゾーンの頂点ドラッグ・回転、テキスト表示が正常に機能すること
- [ ] Biome / TypeCheck / Vitest がすべて PASS すること
  ```bash
  rtk biome check src/components/features/tactical-unified/canvas/
  pnpm type-check:scoped src/components/features/tactical-unified/canvas/annotation-layer.tsx
  rtk vitest run src/components/features/tactical-unified/
  ```
