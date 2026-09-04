---
id: L1-Arch-002
emoji: 🔴
title: "[Phase 1] tactical-unified: canvas/ 内 hooks・helpers のサブディレクトリ整理"
depends_on: ["L1-Arch-001"]
model: Gemini 3.7 Flash
effort: medium
status: DONE
context_files:
  - src/features/tactical-unified/components/canvas/
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
  - src/features/tactical-unified/components/canvas/player-layer.tsx
  - .agents/knowledge/architecture-and-guidelines.md
---

# 🔴 L1-Arch-002: [Phase 1] tactical-unified: canvas/ 内 hooks・helpers のサブディレクトリ整理

## UX Impact
ランタイム動作は変わらない。`canvas/` ディレクトリの見通しが大幅に改善し、Konvaオブジェクト・Canvas操作フック・ヘルパーの3レイヤーが明確に分離される。

## Detailed Spec

### 移動対象（hooks → `canvas/hooks/`）
以下 13 ファイルを `components/canvas/hooks/` へ移動:
- `use-canvas-drawing-interaction.ts`
- `use-canvas-event-listeners.ts`
- `use-canvas-pitch-pan.ts`
- `use-canvas-pointer-dispatcher.ts`
- `use-canvas-pointer-interaction.ts`
- `use-canvas-polygon-zone.ts`
- `use-canvas-quick-tools.ts`
- `use-canvas-selection-box.ts`
- `use-canvas-shape-drawing.ts`
- `use-canvas-space-key.ts`
- `use-canvas-wheel-zoom.ts`
- `use-canvas-zone-rotation.ts`
- `use-canvas-zoom-pan.ts`

### 移動対象（helpers → `canvas/helpers/`）
以下 7 ファイルを `components/canvas/helpers/` へ移動:
- `canvas-coordinates.ts`
- `canvas-pitch-transform-helper.ts`
- `canvas-selection-helpers.ts`
- `canvas-zone-rotation-helpers.ts`
- `drawing-shape-commit.ts`
- `drawing-shape-factory.ts`
- `canvas-registry.ts`

### 手順
1. `canvas/hooks/index.ts` と `canvas/helpers/index.ts` を作成し、各ファイルを re-export。
2. ファイルを移動し、`canvas/` 直下のファイル（`unified-canvas.tsx`, `player-layer.tsx` 等）の import パスを新パスに更新。
3. 1ファイル移動ごとに `rtk biome check` + `rtk pnpm type-check:scoped` でエラーゼロを確認してから次へ進む（マイクロ検証厳守）。

**対象ファイル:** 計 20 ファイル（既存ファイルの移動のみ。ロジック変更なし）

## Acceptance Criteria & Verification Commands
- [x] `canvas/hooks/` に 13 ファイルが配置されている
- [x] `canvas/helpers/` に 7 ファイルが配置されている
- [x] `canvas/` 直下の import が新パスを参照している
- [x] `unified-canvas.tsx` の型エラーがない
- [x] `use-unified-canvas-state.ts` との重複・衝突がない

### Verification
```
rtk biome check src/features/tactical-unified/components/canvas/
rtk pnpm type-check:scoped src/features/tactical-unified/components/canvas/unified-canvas.tsx
rtk vitest run src/features/tactical-unified/
```
