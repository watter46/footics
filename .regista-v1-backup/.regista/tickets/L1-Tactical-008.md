---
id: L1-Tactical-008
title: player-layer.tsx のモジュール分割（1652行→描画要素別サブコンポーネントへの分離）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/player-layer.tsx
---

# L1-Tactical-008: player-layer.tsx のモジュール分割（1652行→描画要素別サブコンポーネントへの分離）

## UX Impact
1,652 行に肥大化した選手レイヤーを関心事ごとに分離し、選手マーカーの描画パフォーマンス（Konva再描画の局所化）を高め、トークン消費を最小化する。

## Detailed Spec
`src/components/features/tactical-unified/canvas/` または `player/` 配下に分離：
1. `player-marker-circle.tsx`: 2D円形マーカー描画（背番号、顔写真、バッジ等）
2. `player-marker-ring.tsx`: 3D足元リングマーカー描画
3. `player-vision-cone.tsx`: 視野コーン扇形・操作ハンドル描画
4. `player-connect-lines.tsx`: 選手間コネクトライン描画
5. `player-focus-spotlight.tsx`: スポットライト描画
6. `player-layer.tsx`: 各要素をマッピングして描画するオーケストレーター（200行以下）

## Acceptance Criteria & Verification Commands
- [ ] 選手、リング、視野コーン、コネクトライン、スポットライトの描画・ドラッグが壊れていないこと
- [ ] Biome / TypeCheck / Vitest がすべて PASS すること
  ```bash
  rtk biome check src/components/features/tactical-unified/canvas/
  pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-layer.tsx
  rtk vitest run src/components/features/tactical-unified/
  ```
