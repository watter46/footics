---
id: L1-Tactical-025
title: 全オブジェクトおよびピッチの汎用ロック機能（Figmaライク）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/lib/types/tactical-unified.ts
  - src/stores/tactical-unified-store.ts
  - src/components/features/tactical-unified/context-hud/context-hud.tsx
---

# L1-Tactical-025: 全オブジェクトおよびピッチの汎用ロック機能（Figmaライク）

## UX Impact
ピッチや選手・図形を個別にロック（固定）できるようになり、ピッチ固定時は誤ドラッグを防いで描画に専念でき、固定解除時はピッチ移動が可能になります。

## Detailed Spec
1. `src/lib/types/tactical-unified.ts`:
   - `TacticalSlide` に `pitchTransform: { panX: number, panY: number, zoom: number, tilt: number, isLocked: boolean }` スキーマを追加。
   - 既存のアノテーション・選手・ボール型に `locked?: boolean` プロパティを保証。
2. `src/stores/tactical-unified-store.ts`:
   - `togglePitchLock(slideId?: string)` アクションの追加。
   - `toggleObjectLock(objectId: string, kind: SelectedObjectKind)` アクションの追加。
   - ロックされた要素に対するドラッグ移動・一括削除のガード。
3. `src/components/features/tactical-unified/context-hud/context-hud.tsx` 等にロック・アンロックボタンを追加。

## Acceptance Criteria & Verification Commands
- [ ] ピッチおよび各種描画オブジェクトにロック状態を付与・解除できること
- [ ] ロックされた要素はキャンバス上でドラッグ移動やキーボード誤削除されないこと

### Verification
`rtk biome check src/lib/types/tactical-unified.ts src/stores/tactical-unified-store.ts`
`pnpm type-check:scoped src/lib/types/tactical-unified.ts src/stores/tactical-unified-store.ts`
