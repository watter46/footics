---
id: L1-Tactical-033
title: arrow-object.tsx のKonva描画要素分割と曲線計算フック抽出 (Konva構造ルール準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/canvas/annotations/arrow-object.tsx
---

# L1-Tactical-033: arrow-object.tsx のKonva描画要素分割と曲線計算フック抽出 (Konva構造ルール準拠)

## UX Impact
矢印・パス線の描画描画負荷を低減し、曲線制御点や矢印ヘッドの個別レンダリングを最適化する。

## Detailed Spec
1. `src/features/tactical-unified/components/canvas/annotations/arrow-object.tsx` (724行) をKonva構造ルールに準拠して分割。
   - `use-arrow-curve.ts`: ベジェ曲線・アンカー制御点・矢印ヘッド幾何計算Hook (150行以内)
   - `arrow-head-node.tsx`: 矢印先端（三角/山型/二重線）描画Konvaノード
   - `arrow-control-points.tsx`: 選択時のベジェ曲率ドラッグハンドル描画Konvaノード
2. `arrow-object.tsx` はGroupコンテナとサブノード配置のみを担当（200行以内）。

## Acceptance Criteria & Verification Commands
- [x] `arrow-object.tsx` が200行以内、フックが150行以内であること
- [x] 直線矢印、曲線矢印、破線、アニメーション追従矢印の表示が崩れないこと

### Verification
`rtk biome check src/features/tactical-unified/components/canvas/annotations`
`pnpm type-check:scoped src/features/tactical-unified/components/canvas/annotations/arrow-object.tsx`
