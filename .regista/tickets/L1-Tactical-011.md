---
id: L1-Tactical-011
title: マーカー移動中のコネクタ追従修正と多重線分岐の解消
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/player-connect-lines.tsx
  - src/components/features/tactical-unified/canvas/player-drag-handler.ts
  - src/components/features/tactical-unified/canvas/canvas-registry.ts
---

# L1-Tactical-011: マーカー移動中のコネクタ追従修正と多重線分岐の解消

## UX Impact
リングマーカー（選手）をドラッグした際に、コネクタ（接続ライン）がリアルタイムに遅延・ズレなく追従し、ドラッグ中に線が枝分かれ（多重表示）するバグが解消されます。

## Detailed Spec
1. **コネクタのネオングロー3層ノード登録 (`player-connect-lines.tsx` / `canvas-registry.ts`)**:
   - 現在 `player-connect-lines.tsx` では発光グロー層、白熱コア層、クリック受付用本体の3本の `<Line>` が描画されているが、`nodesRegistryRef` には本体ライン1本しか登録されていない。
   - そのためドラッグ中に本体ラインのみが移動し、外側グロー層と白熱コア層が初期位置に残されて「ドラッグ中に枝分かれする」現象が発生している。
   - `CanvasNodesRegistry` の `connectLineNodes` を多層ノード構造（例: `{ core: Line, glow: Line, highlight: Line }` または親 `Group`）に対応させるか、親 `Group` または全3本ノードをドラッグ時に同期更新するように修正する。
2. **ドラッグ中の追従処理の完全同期 (`player-drag-handler.ts`)**:
   - `handlePlayerDragMove` 内のコネクトライン更新処理で、対象コネクタのすべての構成 `<Line>` の `points` を同時に `[x1, y1, x2, y2]` へ追従更新する。
   - レイヤーの `batchDraw()` が確実に呼び出され、ちらつきなく60fpsで追従すること。

## Acceptance Criteria & Verification Commands
- [ ] リングマーカーおよび通常マーカーをドラッグした際、接続されているコネクタがリアルタイムに追従すること。
- [ ] ドラッグ中にコネクタが枝分かれ（二重・三重表示）せず、光るネオンライン全体が一体となって移動すること。
- [ ] Biome / TypeCheck がパスすること。

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-drag-handler.ts`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-connect-lines.tsx`
