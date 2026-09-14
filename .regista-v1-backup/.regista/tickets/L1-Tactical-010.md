---
id: L1-Tactical-010
title: unified-canvas.tsx のモジュール分割（1293行→インタラクションフック・プレビューレイヤー分離）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
---

# L1-Tactical-010: unified-canvas.tsx のモジュール分割（1293行→インタラクションフック・プレビューレイヤー分離）

## UX Impact
1,293行に及ぶCanvasオーケストレーターから、ポインターハンドラ、各種プレビュー描画、インラインテキストエディタを分離し、メインコンポーネントを200行前後に圧縮する。

## Detailed Spec
1. `use-canvas-pointer-interaction.ts`: `handlePointerDown`, `handlePointerMove`, `handlePointerUp` のツール別描画・ドラッグロジックを Custom Hook 化。
2. `drawing-preview-layer.tsx`: 描画中の線・矢印・ゾーン・範囲選択 (Marquee) の描画レイヤーを独立。
3. `pitch-inline-text-editor.tsx`: ピッチ上インラインテキストエディタ (`<textarea>`) を独立コンポーネント化。
4. `unified-canvas.tsx`: 上記を合成する軽量コンテナ（200行程度）にリファクタリング。

## Acceptance Criteria & Verification Commands
- [ ] 各ツールのドラッグ描画、範囲選択、テキストインライン編集が正常に動作すること
- [ ] Biome / TypeCheck / Vitest がすべて PASS すること
  ```bash
  rtk biome check src/components/features/tactical-unified/canvas/
  pnpm type-check:scoped src/components/features/tactical-unified/canvas/unified-canvas.tsx
  rtk vitest run src/components/features/tactical-unified/
  ```
