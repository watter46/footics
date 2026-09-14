---
id: L1-Tactical-012
title: リングマーカーにおける接続線・矢印の接続点オフセット調整（リング外周接続）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/player-connect-lines.tsx
  - src/components/features/tactical-unified/canvas/annotations/arrow-object.tsx
  - src/components/features/tactical-unified/canvas/player-drag-handler.ts
---

# L1-Tactical-012: リングマーカーにおける接続線・矢印の接続点オフセット調整（リング外周接続）

## UX Impact
リングマーカー使用時、コネクタや矢印がリングの中心・内部からではなく、リングの外周（楕円の縁）から自然に伸びるようになり、背番号やリングデザインと重ならずクリアな見た目になります。

## Detailed Spec
1. **コネクタライン（ConnectLine）の外周クリップ・オフセット計算**:
   - `player.style.markerType === 'ring'` の場合、リングは横長楕円（rx = radius * 1.15, ry = radius * 0.55）。
   - コネクタの始点・終点を選手中心 (x, y) そのままにするのではなく、接続先へのベクトル方向における楕円外周交点にオフセットさせる。
   - `player-connect-lines.tsx` およびドラッグ時の `player-drag-handler.ts` において、リングマーカー時の端点座標に外周オフセットを適用する。
2. **矢印（Arrow / RouteLine / Dribble）の外周クリップ・オフセット計算**:
   - `arrow-object.tsx` において、`sourcePlayer` または `targetPlayer` がリングマーカー（`markerType === 'ring'`）の場合、矢印の端点をリング楕円の外周から開始・終了するようにオフセット計算を適用する。

## Acceptance Criteria & Verification Commands
- [ ] リングマーカーから伸びるコネクタが、リングの内側（背番号エリア）を横切らず外周から出ること。
- [ ] リングマーカーに接続する矢印もリング外周から自然に伸びること。
- [ ] マーカーのドラッグ時も外周オフセットが破綻せず維持されること。
- [ ] Biome / TypeCheck がパスすること。

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-connect-lines.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/annotations/arrow-object.tsx`
