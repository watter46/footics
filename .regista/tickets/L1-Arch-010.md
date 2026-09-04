---
id: L1-Arch-010
emoji: 🟢
title: "tactical-unified: objects/arrow/ の垂直スライス化（矢印・軌跡レイヤー分離）"
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/canvas/ghost-trajectory-arrow.tsx
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
status: DONE
---

# 🟢 L1-Arch-010: tactical-unified: objects/arrow/ の垂直スライス化（矢印・軌跡レイヤー分離）

## UX Impact
矢印・軌跡描画ロジックが独立したサブモジュールとなり、拡張・修正時の影響範囲が明確になる。

## Detailed Spec
1. `src/features/tactical-unified/objects/arrow/` ディレクトリを作成し、自己完結4要素（`components/`, `hooks/`, `types.ts`, `index.ts`）を配置する。
2. 以下のファイルを `objects/arrow/components/` へ移動する:
   - `components/canvas/ghost-trajectory-arrow.tsx`
3. 矢印描画に関連するフックがあれば `objects/arrow/hooks/` へ切り出す（現時点では `drawing-preview-layer.tsx` 内に混在している可能性があるため要確認）。
4. `objects/arrow/types.ts` に矢印固有の型を集約する（`stores/` や `canvas-interaction-types.ts` から移植）。
5. `objects/arrow/index.ts` で公開APIを定義する。
6. `unified-canvas.tsx` 等のインポートパスを新パスへ更新する。

## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/objects/arrow/` が `components/`, `hooks/`, `types.ts`, `index.ts` の4要素で構成されている
- [x] `components/canvas/ghost-trajectory-arrow.tsx` が旧パスに存在しない
- [x] `unified-canvas.tsx` 等のインポートが新パスを参照している
- [x] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/objects/arrow/`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/arrow/index.ts src/features/tactical-unified/components/canvas/unified-canvas.tsx`
