#!/bin/bash
mkdir -p /home/watter46/src/footics/.regista/tickets

cat << 'TICKET1' > /home/watter46/src/footics/.regista/tickets/L1-tactical-001.md
---
id: L1-tactical-001
title: "Pitch Aspect Ratio & Transition Animation"
effort: "Mid"
status: "TODO"
dependencies: []
assignee: "regista-canvas"
---

# 目的
- ピッチのアスペクト比と選手の初期配置の向きの不整合を修正する（横向きピッチに対して縦配置になる問題）。
- アスペクト比切り替え時（`/test/pitch-aspect` のような）に、ピッチと選手にトランジションアニメーションを追加する。

# 修正箇所案
1. `src/lib/types/tactical-unified.ts` (または `stores/tactical-unified-store.ts`)
   - `createDefaultProject` などの初期化時、`aspectRatio` が `4:5` などの縦向きの場合に、選手の `(x, y)` を正しく縦向きとして初期化するよう修正。
   - もしくは `transformCoord` などの変換ロジックが現在の期待と逆になっていないか確認・修正。
2. `src/features/tactical-unified/components/canvas/unified-canvas.tsx` または `player-layer.tsx`, `pitch-background.tsx`
   - `framer-motion` の `<motion.Group>` 等を導入し、アスペクト比切替時 (x, y の変化) にアニメーション（`layout` 属性や `animate` プロパティ）を適用する。
TICKET1

cat << 'TICKET2' > /home/watter46/src/footics/.regista/tickets/L1-tactical-002.md
---
id: L1-tactical-002
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
TICKET2

cat << 'TICKET3' > /home/watter46/src/footics/.regista/tickets/L1-tactical-003.md
---
id: L1-tactical-003
title: "Player 2D UI & Independent Ring Attributes"
effort: "High"
status: "TODO"
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
TICKET3

cat << 'TICKET4' > /home/watter46/src/footics/.regista/tickets/L1-tactical-004.md
---
id: L1-tactical-004
title: "HUD Color Picker Fix"
effort: "Low"
status: "TODO"
dependencies: []
assignee: "regista-frontend"
---

# 目的
- オブジェクト選択時のフローティングHUDに表示されるカラーパネルの白表示が黒色になってしまうバグを修正する。

# 修正箇所案
1. `src/features/tactical-unified/components/hud/mini-color-picker.tsx`
   - 右パネルの `src/features/tactical-unified/components/common-color-input.tsx` の実装に合わせる。
   - `#ffffff` の時に `bg-white` などのクラスが Tailwind v4 で正しく適用されるようにするか、`<svg>` の `fill` 指定や親要素の背景色透過などを見直して、強制ダークモードの影響を排除する。
TICKET4

chmod +x /home/watter46/src/footics/scripts/create_tactical_tickets.sh
/home/watter46/src/footics/scripts/create_tactical_tickets.sh
