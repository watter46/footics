---
id: L2-Tactical-038
title: "Pitch Aspect Ratio & Transition Animation"
effort: "Mid"
status: DONE
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
