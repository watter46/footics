---
id: L2-Tactical-003
title: トップヘッダーの大掃除（Figma調の洗練）とパフォーマンス改善
status: TODO
depends_on:
  - L1-Tactical-001
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/toolbar/top-bar.tsx
  - src/stores/tactical-unified-store.ts
---

# L2-Tactical-003: トップヘッダーの大掃除（Figma調の洗練）とパフォーマンス改善

## UX Impact
上部ヘッダー（TopBar）に乱立していた雑多なボタンを整理し、視覚的なノイズを取り除く。プロジェクト名、Undo/Redo、主要な書き出し機能のみを表に出し、残りはドロップダウンメニュー（...）に格納することで、プロツールにふさわしい洗練された外観にする。また、Store購読の最適化で動作を軽くする。

## Detailed Spec
1. `top-bar.tsx` のUIリファクタリング。
   - 左側: ハンバーガーメニュー or フットボールアイコン（メインメニュー）、プロジェクト名、Undo/Redo。
   - 中央: アスペクト比切り替え。
   - 右側: エクスポートボタン（Primary）、その他（`...` ドロップダウンメニュー）。
2. ドロップダウン（`...`）に以下を移動する:
   - 左右入れ替え (Swap Sides)
   - デフォルトピッチリセット
   - 画像読込 (Import Image)
   - ベンチマークプリセット
3. 不要なStoreの全購読（`useTacticalUnifiedStore((s) => s)` のような記述や、状態変更が激しいプロパティへの不要な依存）を見直し、`top-bar.tsx` が不要に再描画されないようにする（パフォーマンス改善）。

## Acceptance Criteria & Verification Commands
- [ ] TopBarがすっきりし、主要なアクション以外はドロップダウンに格納されている。
- [ ] 既存の機能（画像読込、プリセット読込、左右入れ替え等）が失われずに動作する。
- [ ] Zustandのセレクタが細粒度になり、マウス移動等でTopBarが再描画されない（React Profiler等で確認可能レベル）。

### Verification
`rtk biome check src/components/features/tactical-unified/toolbar/top-bar.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/toolbar/top-bar.tsx`
