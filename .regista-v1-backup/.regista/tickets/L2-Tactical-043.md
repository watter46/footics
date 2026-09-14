---
id: L2-Tactical-043
emoji: 🐛
title: スライド再生時のフォーメーション画面外バグ修正
status: DONE
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/hooks/use-tactical-animation.ts
  - src/features/tactical-unified/components/canvas/unified-canvas.tsx
---

# 🐛 L2-Tactical-043: スライド再生時のフォーメーション画面外バグ修正

## UX Impact
スライド再生ボタンを押した際、フォーメーションが画面外に飛んでしまうバグが解消され、ピッチ内で正しくアニメーション再生されるようになる。

## Detailed Spec
1. `src/features/tactical-unified/hooks/use-tactical-animation.ts` を修正する。
2. 現在、`playAnimation` や `stopAnimation`, `seekTo` などの中で `stage.width()` や `stage.height()` を取得して `applyFrameToCanvas` に渡しているが、これはブラウザウィンドウ全体のサイズ（黒帯含む）になってしまっている。
3. これらを `use-unified-canvas-state.ts` または Store から `pitchSize`（または `calculatePitchRect` によって算出されたピッチ実領域の幅・高さ）を取得するように変更するか、Store側に保持された `pitchSize` を参照するようにする。これにより `updatePlayerNodes` などが正しいスケールで座標計算を行うように修正する。

## Acceptance Criteria & Verification Commands
- [ ] スライド再生ボタンを押しても、フォーメーションが画面外に飛ばないこと。
- [ ] プレイヤーやボールのアニメーションがピッチの境界（黒帯を除く領域）に正しくマッピングされていること。

### Verification
`rtk biome check src/features/tactical-unified/hooks/use-tactical-animation.ts`
`pnpm type-check:scoped src/features/tactical-unified/hooks/use-tactical-animation.ts`
