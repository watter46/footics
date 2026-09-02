---
id: L1-Tactical-002
title: 選択要素のコンテキストHUD（フローティングパレット）基盤作成
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/components/features/tactical-unified/context-hud.tsx
---

# L1-Tactical-002: 選択要素のコンテキストHUD（フローティングパレット）基盤作成

## UX Impact
キャンバス上の選手や矢印をクリックした際、右パネルまでマウスを移動させなくても、要素のすぐ近く（直上など）に色や番号、削除ボタンが表示される。これにより、視線移動とマウス移動のストレスが劇的に軽減される。

## Detailed Spec
1. 新規コンポーネント `context-hud.tsx` を `src/components/features/tactical-unified/` に作成。
2. Zustandストアの `selectedObjects` を監視し、選択要素が1つの場合にそのHUDを表示する。
3. HUDの表示位置は、選択されたオブジェクトのキャンバス上の座標（ピクセル）から算出する。Konvaのレイヤー/オブジェクト位置を取得し、Reactの絶対座標（DOM層の absolute/fixed overlay）としてHUDを描画する。
4. HUDの内容（まずはモックアップ、もしくはインスペクターの簡易版）：
   - 選手選択時: 背番号変更入力、色変更（リング/塗り）、削除ボタン。
   - 矢印/図形選択時: 線の太さ、色変更、削除ボタン。
5. `unified-canvas.tsx` 内で、選択オブジェクトのスクリーン座標をストアまたはReact Stateに送る仕組みを構築（もしくはHUDコンポーネントがStageの参照を持って計算する）。

## Acceptance Criteria & Verification Commands
- [ ] 選手や図形を選択すると、画面上のその要素の近くにHUDが表示される。
- [ ] 選択を解除するとHUDが消える。
- [ ] 画面のズームやパン（もしあれば）に対応してHUDが追従する、もしくは再計算される。
- [ ] HUD内のUIが、Figmaなどのような小さく洗練されたピル型（角丸のフローティングバー）であること。

### Verification
`rtk biome check src/components/features/tactical-unified/context-hud.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/context-hud.tsx`
