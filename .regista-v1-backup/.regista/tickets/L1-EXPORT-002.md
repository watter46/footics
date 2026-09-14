---
status: DONE
id: L1-EXPORT-002
emoji: 🔴
title: Data Export Panelコンポーネントの実装
depends_on: []
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/features/tactical-unified/panels/export/export-panel-ui.tsx
  - src/features/tactical-unified/stores/tactical-unified-store.ts
---
status: DONE

# 🔴 L1-EXPORT-002: Data Export Panelコンポーネントの実装

## UX Impact
ユーザーが戦術データをJSONまたはCSV形式でエクスポートするためのパネルUIを利用できるようになり、データの外部連携が容易になる。

## Detailed Spec
1. `src/features/tactical-unified/panels/export/` 内にエクスポート実行用UIコンポーネントを新規作成・拡張する。
2. フォーマット選択用のドロップダウン（JSON / CSV）と、エクスポート実行用ボタンを実装する。
3. 既存の `useExportStore`（またはエクスポートに関連するStore）と連携し、選択状態の管理とエクスポート処理の発火を行う。

## Acceptance Criteria & Verification Commands
- [ ] パネルUIにJSONとCSVのフォーマット選択ドロップダウンが表示されること
- [ ] エクスポート実行ボタンをクリックすると、Storeのアクションが正しく呼び出されること
- [ ] UIコンポーネントのLint/TypeCheckエラーがないこと

### Verification
`rtk biome check src/features/tactical-unified/panels/export`
`pnpm type-check:scoped src/features/tactical-unified/panels/export/`
