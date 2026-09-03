---
id: L1-Tactical-013
title: スポットライト（Focus）のサイズ・底面位置のリング整合およびデフォルト白設定
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/canvas/player-focus-spotlight.tsx
  - src/components/features/tactical-unified/inspector/player-marker-options-section.tsx
  - src/lib/types/tactical-unified.ts
---

# L1-Tactical-013: スポットライト（Focus）のサイズ・底面位置のリング整合およびデフォルト白設定

## UX Impact
スポットライト機能（Focus）を有効にした際、上から降り注ぐ光の柱の底面円がリングマーカーの大きさと楕円形状にぴったりと一致し、デフォルト色が白（#ffffff）になって洗練されたステージライト演出が即座に得られます。

## Detailed Spec
1. **デフォルト色の白統一 (`#ffffff`)**:
   - `player-marker-options-section.tsx` 内の `handleTabClick('focus')` およびトグル時の初期生成色を `#fbbf24` から `#ffffff` に変更。
   - `PlayerFocusSchema` のデフォルト（`#ffffff`）と整合させる。
2. **スポットライト底面とリングマーカーの形状・サイズ・位置の一致 (`player-focus-spotlight.tsx`)**:
   - スポットライト底面の円弧スケールがリングマーカー（横長楕円 rx: `radius * 1.15`, ry: `radius * 0.55`）の外周に正確に合うよう、scale および基準点 offset (tx, ty) を精緻に再調整する。
   - スポットライト全体のサイズ感が過大または不整合にならないようスケーリング係数を整合させる。

## Acceptance Criteria & Verification Commands
- [ ] スポットライトをONにした際、初期色が白（#ffffff）で表示されること。
- [ ] スポットライトの光の底面の楕円がリングマーカーの足元リングと自然に重なり、サイズと位置がフィットしていること。
- [ ] Biome / TypeCheck がパスすること。

### Verification
`rtk biome check src/components/features/tactical-unified/canvas/player-focus-spotlight.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/canvas/player-focus-spotlight.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/inspector/player-marker-options-section.tsx`
