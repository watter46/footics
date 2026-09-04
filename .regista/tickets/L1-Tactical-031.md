---
id: L1-Tactical-031
title: context-hud.tsx の対象別HUDコンポーネント分割 (200行制限準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/context-hud.tsx
---

# L1-Tactical-031: context-hud.tsx の対象別HUDコンポーネント分割 (200行制限準拠)

## UX Impact
フローティングHUDの見た目や操作性を変えず、選択オブジェクト種別に応じたHUDコンポーネントへ分割して可読性を最大化する。

## Detailed Spec
1. `src/features/tactical-unified/components/context-hud.tsx` (1028行) から各オブジェクト種別のHUDを `src/features/tactical-unified/components/hud/` 配下に分離。
   - `player-hud.tsx`: 選手マーカー操作HUD
   - `arrow-hud.tsx`: 矢印・パス線操作HUD
   - `zone-hud.tsx`: ゾーン・領域操作HUD
   - `ball-hud.tsx`: ボール操作HUD
   - `text-hud.tsx`: テキスト注釈操作HUD
2. 親コンポーネント `context-hud.tsx` は選択状態の解決と各HUDの切り替え表示のみを担当（150行以内）。

## Acceptance Criteria & Verification Commands
- [ ] 各HUDコンポーネントが200行以内であること
- [ ] 各要素選択時のHUD表示・操作が正常に機能すること

### Verification
`rtk biome check src/features/tactical-unified/components/hud`
`pnpm type-check:scoped src/features/tactical-unified/components/context-hud.tsx`
