---
id: L2-Tactical-041
title: "HUD Color Picker Fix"
effort: "Low"
status: "DONE"
dependencies: []
assignee: "regista-frontend"
---

# 目的
- オブジェクト選択時のフローティングHUDに表示されるカラーパネルの白表示が黒色になってしまうバグを修正する。

# 修正箇所案
1. `src/features/tactical-unified/components/hud/mini-color-picker.tsx`
   - 右パネルの `src/features/tactical-unified/components/common-color-input.tsx` の実装に合わせる。
   - `#ffffff` の時に `bg-white` などのクラスが Tailwind v4 で正しく適用されるようにするか、`<svg>` の `fill` 指定や親要素の背景色透過などを見直して、強制ダークモードの影響を排除する。
