---
id: L1-Arch-012
emoji: 🟢
status: DONE
title: "tactical-unified: components/canvas/ を objects/canvas/ へ統合（Canvasレイヤー正規化）"
depends_on: []
model: Gemini 3.7 Flash
effort: high
context_files:
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
  - src/features/tactical-unified/components/canvas/hooks/index.ts
  - src/features/tactical-unified/components/canvas/helpers/index.ts
---

# 🟢 L1-Arch-012: tactical-unified: components/canvas/ を objects/canvas/ へ統合（Canvasレイヤー正規化）

## UX Impact
Canvasコアロジックが正式な配置場所へ集約され、アーキテクチャ規約に完全準拠する。

## Detailed Spec
アーキテクチャ規約では `objects/canvas/` を特別なキャンバス統合ディレクトリとして定義しており、以下の構造を目指す:
```
objects/canvas/
├── components/     # unified-canvas.tsx, boundary-box.tsx, drawing-preview-layer.tsx 等
├── hooks/          # use-canvas-*.ts 全フック
├── helpers/        # canvas-*-helpers.ts 全ヘルパー
└── index.ts        # 公開API
```

1. `src/features/tactical-unified/objects/canvas/` を作成する（`components/`, `hooks/`, `helpers/`, `index.ts`）。
2. 以下を `objects/canvas/components/` へ移動する:
   - `components/canvas/unified-canvas.tsx`
   - `components/canvas/boundary-box.tsx`
   - `components/canvas/drawing-preview-layer.tsx`
   - `components/canvas/canvas-interaction-types.ts`
   - `components/canvas/use-node-position-transition.ts`
   - `components/canvas/use-unified-canvas-state.ts`
3. 以下を `objects/canvas/hooks/` へ移動する（`components/canvas/hooks/` 配下全体）:
   - `use-canvas-drawing-interaction.ts`, `use-canvas-event-listeners.ts`, `use-canvas-pitch-pan.ts`, `use-canvas-pointer-dispatcher.ts`, `use-canvas-pointer-interaction.ts`, `use-canvas-polygon-zone.ts`, `use-canvas-quick-tools.ts`, `use-canvas-selection-box.ts`, `use-canvas-shape-drawing.ts`, `use-canvas-space-key.ts`, `use-canvas-wheel-zoom.ts`, `use-canvas-zone-rotation.ts`, `use-canvas-zoom-pan.ts`
4. 以下を `objects/canvas/helpers/` へ移動する（`components/canvas/helpers/` 配下全体）:
   - `canvas-coordinates.ts`, `canvas-pitch-transform-helper.ts`, `canvas-registry.ts`, `canvas-selection-helpers.ts`, `canvas-zone-rotation-helpers.ts`, `drawing-shape-commit.ts`, `drawing-shape-factory.ts`
5. `objects/canvas/index.ts` で公開APIを定義する。
6. 旧 `components/canvas/` ディレクトリ（arrow/zone移行後に空になったもの）を削除する。
7. Feature外からのインポートパスを `index.ts` 経由に統一する。

## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/objects/canvas/` が `components/`, `hooks/`, `helpers/`, `index.ts` で構成されている
- [x] `components/canvas/` ディレクトリが存在しない（または空）
- [x] 他ファイルからのインポートエラーがない
- [x] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/objects/canvas/`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/index.ts`
