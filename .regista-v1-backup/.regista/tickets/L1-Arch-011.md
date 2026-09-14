---
id: L1-Arch-011
emoji: 🟢
title: "tactical-unified: objects/zone/ の垂直スライス化（アノテーション・ゾーン分離）"
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/canvas/annotations/zone-object.tsx
  - src/features/tactical-unified/components/canvas/annotations/zone-types.ts
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
status: DONE
---

# 🟢 L1-Arch-011: tactical-unified: objects/zone/ の垂直スライス化（アノテーション・ゾーン分離）

## UX Impact
ゾーン・アノテーション描画ロジックが独立したサブモジュールとなり、ドメイン境界が明確になる。

## Detailed Spec
1. `src/features/tactical-unified/objects/zone/` を作成し、4要素（`components/`, `hooks/`, `types.ts`, `index.ts`）を配置する。
2. 以下のファイルを `objects/zone/components/` へ移動する（`annotations/` ディレクトリごと移動しても可）:
   - `components/canvas/annotations/zone-object.tsx`
   - `components/canvas/annotations/zone-polygon-handles.tsx`
   - `components/canvas/annotations/zone-polygon-node.tsx`
   - `components/canvas/annotations/zone-shape-node.tsx`
3. 以下のフックを `objects/zone/hooks/` へ移動する:
   - `components/canvas/annotations/use-arrow-sync.ts`
   - `components/canvas/annotations/use-zone-polygon.ts`
   - `components/canvas/annotations/use-zone-shape.ts`
4. 以下のユーティリティ・型を `objects/zone/types.ts` またはヘルパーとして整理する:
   - `components/canvas/annotations/zone-types.ts`
   - `components/canvas/annotations/zone-shape-geometry.ts`
   - `components/canvas/annotations/wavy-arrow-math.ts`
5. `objects/zone/index.ts` で公開APIを定義する。
6. `components/canvas/annotation-layer.tsx` は `objects/canvas/` 側の統合レイヤーとして残すか、`objects/zone/` に取り込むかを判断して移動する。
7. `unified-canvas.tsx` のインポートを新パスへ更新する。

## Acceptance Criteria & Verification Commands
- [x] `src/features/tactical-unified/objects/zone/` が4要素で構成されている
- [x] `components/canvas/annotations/` ディレクトリが空になり削除されている
- [x] `unified-canvas.tsx` のインポートが新パスを参照している
- [x] 型エラーがない

### Verification
`rtk biome check src/features/tactical-unified/objects/zone/`
`rtk pnpm type-check:scoped src/features/tactical-unified/objects/zone/index.ts src/features/tactical-unified/components/canvas/unified-canvas.tsx`
