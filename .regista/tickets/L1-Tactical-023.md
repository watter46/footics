---
id: L1-Tactical-023
title: ツールバーからの不要ボタン削除（メディア最適化比率メニュー & Auto-fit boundary）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx
---

# L1-Tactical-023: ツールバーからの不要ボタン削除（メディア最適化比率メニュー & Auto-fit boundary）

## UX Impact
下部描画ツールバーから重複していたメディア比率ポップオーバーと全画面フィットボタンが削除され、ツールバーがコンパクトで無駄のない構成になります（境界線直上のHUDから全操作が可能）。

## Detailed Spec
1. `src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx` 内の `XMediaPresetMenu` の呼び出しおよびインポートを削除。
2. 同ツールバー末尾の `Auto-fit boundary` ボタン（`Maximize2`）および区切り線を削除。
3. 未使用となった `autoFitBoundaryBox` のストアセレクター参照をクリーンアップ。

## Acceptance Criteria & Verification Commands
- [ ] 下部ツールバーにメディア比率ポップオーバーとAuto-fitボタンが表示されないこと
- [ ] 境界線HUD上の比率切替およびフィット操作は正常に機能し続けること

### Verification
`rtk biome check src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/toolbar/drawing-toolbar.tsx`
