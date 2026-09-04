---
id: L2-Tactical-044
emoji: ✨
title: ドラッグ中の軌跡矢印リアルタイム追従機能の実装
depends_on: []
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/canvas/player-drag-handler.ts
  - src/features/tactical-unified/components/canvas/player-layer.tsx
  - src/features/tactical-unified/components/canvas/ghost-trajectory-arrow.tsx
---

# ✨ L2-Tactical-044: ドラッグ中の軌跡矢印リアルタイム追従機能の実装

## UX Impact
プレイヤーをドラッグして移動させている最中に、ゴースト（過去位置）から伸びる追跡矢印の先端が、実マーカーの動きに合わせてリアルタイムで追従するようになる。

## Detailed Spec
1. 現在、`player-drag-handler.ts` の `handlePlayerDragMove` では実マーカー（Konvaノード）のみが移動し、StoreのReact Stateは更新されないため、`PlayerGhostTrajectory`（およびその中の `GhostTrajectoryArrow`）の先端位置がドラッグ中に更新されない。
2. `player-drag-handler.ts` 内の `handlePlayerDragMove` で、ドラッグ中のプレイヤーに対応する `GhostTrajectoryArrow`（軌跡矢印）の終端座標（`points`）をリアルタイムで命令的に更新する処理を追加する。
3. （推奨案）`CanvasNodesRegistry`（`canvas-registry.ts`）に `trajectoryArrowNodes` などのMapを追加し、`GhostTrajectoryArrow` がマウント時に自身を登録するようにする。ドラッグ中にそのノード群を参照して先端を追従させるか、あるいはオニオンスキンのようにRefを渡して更新する。status: DONE

## Acceptance Criteria & Verification Commands
- [x] プレイヤーマーカーをドラッグ中、過去のゴーストから伸びる矢印の先端が、ドラッグ中のマーカーにぴったり追従すること。
- [x] ドラッグ終了時にStoreが更新され、矢印が正しい位置で確定すること。

### Verification
`rtk biome check src/features/tactical-unified/components/canvas/`
`pnpm type-check:scoped src/features/tactical-unified/components/canvas/player-drag-handler.ts`
