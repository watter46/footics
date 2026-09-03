---
id: L1-Tactical-006
title: 足元リングとコネクタのデフォルト色統一＆発光グロー演出
status: TODO
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/player-layer.tsx
  - src/stores/tactical-unified-store.ts
---

# L1-Tactical-006: 足元リングとコネクタのデフォルト色統一＆発光グロー演出

## UX Impact
足元リングマーカーと選手間をつなぐコネクタ（ライン）の色がデフォルトで美しく統一され、暗い背景・実写画像の上でもネオンのように光を放つ（Glow / 発光）表現になることで、戦術解説図としてのプロ感・視認性が飛躍的に向上する。

## Detailed Spec
1. **デフォルト色の統一**:
   - 選手マーカー（リング）とコネクタライン（ConnectLine）のデフォルト色をシームレスに同期（例: 鮮やかなシアン `#38bdf8` やネオンイエロー `#facc15`、または所属チームカラー連動）。
   - コネクタ接続時、接続元プレイヤーのリング色（`player.style.color` / `strokeColor`）をコネクタのデフォルト色として自動引き継ぎ。
2. **発光（Glow）ビジュアル演出**:
   - **足元リング**:
     - Konvaの `shadowColor` / `shadowBlur` (8〜14px) / `shadowOpacity` (0.8〜0.9) を適用し、リングの輪郭から光がふんわりと発光しているような立体ネオングローを付与。
   - **コネクタライン (`Line`)**:
     - 単なるベタ塗り線ではなく、外側に同系色の半透明・太めのぼかし線（または Konva `shadowColor` / `shadowBlur`）を重ねて配置し、光るライトセーバー／レーザーのような発光感を演出。

## Acceptance Criteria & Verification Commands
- [ ] 足元リングマーカーが暗いピッチや画像の上で美しく発光して見えること。
- [ ] 選手からコネクタを引いた際、デフォルトでリングと同じ発光カラーが適用されること。
- [ ] パフォーマンス（FPS）に悪影響が出ないよう、Konvaの過剰なフィルター再計算を避けて軽量なShadowプロパティで実装されていること。

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/player-layer.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-layer.tsx`
