---
id: L1-CANVAS-002
emoji: 🔧
title: BoundaryBox Stageによるイベントブロックの修正
depends_on: []
model: Gemini 3.7 Flash
effort: medium
status: DONE
context_files:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
---

# 🔧 L1-CANVAS-002: BoundaryBox Stageによるイベントブロックの修正

## UX Impact
ツールバーで描画ツールを選択後、キャンバス上で正しく図形が描画できるようになり、オブジェクトの選択や操作も可能になる。

## Detailed Spec
1. `unified-canvas.tsx` において、`BoundaryBox` 用の `Stage` がメインの `Stage` を覆い隠し（`pointerEvents: 'auto'`）、マウス・タッチイベントを完全にブロックしている問題を修正する。
2. `BoundaryBox` 用の `Stage` コンテナに対して透過処理を行うか、あるいは `BoundaryBox` の実装を DOM (HTML/CSS) ベースのオーバーレイにリファクタリングして、メイン `Stage` へのイベント透過を正しく制御する。
3. 修正後、メインの `Stage` で `handlePointerDown` 等が正常に発火し、描画プレビューや選択が適切に行えるようにする。

## Acceptance Criteria & Verification Commands
- [ ] ツールバーで図形ツールを選択し、キャンバス上で正しく描画ができること。
- [ ] 描画中に `DrawingPreviewLayer` が表示されること。
- [ ] `BoundaryBox` のハンドルをドラッグしてリサイズできること。

### Verification
`rtk biome check src/features/tactical-unified/objects/canvas/components`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`
