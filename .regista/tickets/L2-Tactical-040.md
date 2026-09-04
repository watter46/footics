---
id: L2-Tactical-040
title: "Player 2D UI & Independent Ring Attributes"
effort: "High"
status: "DONE"
completed_at: "2026-09-04T18:16:08+09:00"
dependencies: []
assignee: "regista-canvas"
---

# 目的
- 3Dリングとの切り替え機能を削除し、Playerマーカーを2Dに特化して目立つように装飾（サイズは肥大化させない）。
- Playerに付随する「視野 (Vision Cone)」「コネクタ (ConnectLines)」「スポットライト (Focus)」を、個別で選択・色変更・削除ができるように分離・修正。

# 修正箇所案
1. `src/features/tactical-unified/components/canvas/player-marker.tsx`, `player-marker-ring.tsx`
   - 3D用の描画コード（`tilt`による変形など）やトグル設定を削除・整理。2D向けのクリーンで目立つ装飾を追加。
2. `src/features/tactical-unified/components/canvas/player-vision-cone.tsx`, `player-connect-lines.tsx`, `player-focus-spotlight.tsx`
   - クリックイベントを追加し、Store内で選択された時に個別のオブジェクト (`kind: 'visionCone'`, `kind: 'connectLine'`, `kind: 'focus'`) として認識されるようにする。
   - `tactical-unified-store.ts` および `inspector-panel.tsx` にて、これらが個別に選択された時のプロパティ変更UIを提供する。

## Completed At
- 2026-09-04T18:16:08+09:00
