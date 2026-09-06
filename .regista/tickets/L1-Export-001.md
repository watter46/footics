---
status: DONE
id: L1-Export-001
emoji: 💾
title: データエクスポートパネルUIの実装と既存Storeとの統合
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/panels/export/data-export-panel.tsx
  - src/features/tactical-unified/panels/export/index.ts
---
status: DONE

# 💾 L1-Export-001: データエクスポートパネルUIの実装と既存Storeとの統合

## UX Impact
ユーザーが戦術データをJSONやCSVフォーマットでエクスポートできるようになり、データの外部連携やバックアップが容易になります。

## Detailed Spec
1. `src/features/tactical-unified/panels/export/data-export-panel.tsx` を新規作成する。
2. コンポーネント内にエクスポート形式を選択するドロップダウン（JSON, CSV）と、エクスポートを実行するボタンを実装する。
3. 既存の `useExportStore` をインポートし、ストアのアクション（エクスポート処理）をボタンクリック時に呼び出すように統合する。
4. `src/features/tactical-unified/panels/export/index.ts` から `DataExportPanel` をエクスポートする。

## Acceptance Criteria & Verification Commands
- [ ] `DataExportPanel` コンポーネントが作成され、JSON/CSVの選択ドロップダウンと実行ボタンが存在する。
- [ ] `useExportStore` と正しく連携し、エクスポートアクションをトリガーできる。
- [ ] `index.ts` から正しくエクスポートされている。

### Verification
`rtk biome check src/features/tactical-unified/panels/export`
`pnpm type-check:scoped src/features/tactical-unified/panels/export/data-export-panel.tsx`
