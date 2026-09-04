---
id: L2-Tactical-039
title: "Boundary Box Refactoring"
effort: "Low"
status: "TODO"
dependencies: []
assignee: "regista-canvas"
---

# 目的
- 境界線（Boundary Box）の中を掴んでドラッグできないようにし、枠線でのみドラッグ可能にする。
- アスペクト比が横キャンパス最大値になるバグの修正。
- AutoFitPitch と AutoFitCanvas のアイコンを入れ替える。
- AutoFitPitch 選択時にピッチと境界線の間に3%の余白を追加する。

# 修正箇所案
1. `src/features/tactical-unified/components/canvas/boundary-box.tsx`
   - `<Group draggable>` ではなく、枠線となる `<Rect>` 自体に `draggable` と `hitFunc` を持たせるか、背景の当たり判定を無効化する。
2. `src/features/tactical-unified/components/toolbar/boundary-box-hud.tsx`
   - `handlePitchFit` と `handleCanvasFit` のアイコン (`<Maximize2>`, `<Expand>`) を入れ替える。
3. `src/features/tactical-unified/stores/tactical-unified-store.ts`
   - `computePitchFitBoundaryBox` にて、フィット時に上下左右3%分の余白（マージン）を持たせる計算式に修正。
