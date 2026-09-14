---
status: DONE
id: L1-Tactical-105
emoji: 💾
title: Tactical Data Export Panelの実装
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/panels/export/data-export-panel.tsx
---
status: DONE

# 💾 L1-Tactical-105: Tactical Data Export Panelの実装

## UX Impact
ユーザーがTactical UI上でJSONやCSV形式でのデータエクスポートを選択・実行できるようになります。

## Detailed Spec
1. `src/features/tactical-unified/panels/export/data-export-panel.tsx` を新規作成する。
2. JSON形式またはCSV形式を選択できるドロップダウン（セレクトボックス）と、エクスポートを実行するボタンをUIとして配置する。
3. 既存の `useExportStore` (あるいは該当するエクスポート用Store)と連携し、ボタンクリック時に指定されたフォーマットでデータエクスポート処理をトリガーする。

## Acceptance Criteria & Verification Commands
- [ ] Data Export Panelコンポーネントが描画され、フォーマットの選択とエクスポートボタンが表示されていること
- [ ] `useExportStore` と連携し、フォーマットに従ったエクスポート処理が呼び出されること
- [ ] TypeScriptの型エラーやBiome Lintエラーが出ないこと

### Verification
`rtk biome check src/features/tactical-unified/panels/export/`
`rtk pnpm type-check:scoped src/features/tactical-unified/panels/export/data-export-panel.tsx`
