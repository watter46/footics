---
id: L1-Tactical-007
title: inspector-panel.tsx のモジュール分割（2365行→対象別個別インスペクターへの分離）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/components/features/tactical-unified/inspector/inspector-panel.tsx
---

# L1-Tactical-007: inspector-panel.tsx のモジュール分割（2365行→対象別個別インスペクターへの分離）

## UX Impact
ファイルサイズが 2,365 行に肥大化し、わずかな変更でも数万トークンを消費するボトルネックを解消する。各インスペクターの保守性と再描画パフォーマンスが向上する。

## Detailed Spec
`src/components/features/tactical-unified/inspector/` 配下に各専用コンポーネントを切り出す：
1. `player-inspector.tsx`: 選手用インスペクター本体
2. `player-marker-options-section.tsx`: 視野コーン、コネクト、矢印、フォーカス等のオプションタブ群
3. `arrow-inspector.tsx`: 矢印用インスペクター
4. `zone-inspector.tsx`: ゾーン用インスペクター
5. `text-inspector.tsx`: テキスト用インスペクター
6. `slide-inspector.tsx`: スライド全体・背景設定用インスペクター
7. `inspector-shared-controls.tsx`: `TextInput`, `RangeInput`, `Row`, `DeleteButton` 等の共通UI部品
8. `inspector-panel.tsx`: 上記を統合してタブ・選択状態を切り替える軽量コンテナ（150行程度）にリファクタリング。

## Acceptance Criteria & Verification Commands
- [ ] 各インスペクターが独立ファイルに分割され、循環参照なくエクスポートされていること
- [ ] 既存の動作（選手・矢印・ゾーン・テキストのインスペクター操作）が一切壊れていないこと
- [ ] Biome / TypeCheck / Vitest がすべて PASS すること
  ```bash
  rtk biome check src/components/features/tactical-unified/inspector/
  pnpm type-check:scoped src/components/features/tactical-unified/inspector/inspector-panel.tsx
  rtk vitest run src/components/features/tactical-unified/
  ```
