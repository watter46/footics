---
id: L1-Tactical-034
title: project-manager-modal.tsx のプロジェクト一覧・作成・インポート分割 (200行制限準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/dialogs/project-manager-modal.tsx
---

# L1-Tactical-034: project-manager-modal.tsx のプロジェクト一覧・作成・インポート分割 (200行制限準拠)

## UX Impact
戦術プロジェクト管理モーダルの表示・保存・削除の操作性を維持しつつコードベースを保守しやすくする。

## Detailed Spec
1. `src/features/tactical-unified/components/dialogs/project-manager-modal.tsx` (916行) を分割。
   - `project-list-view.tsx`: 保存済みプロジェクト一覧・サムネイル表示・削除
   - `project-create-form.tsx`: 新規プロジェクト作成（名前・ピッチ設定）
   - `project-import-export.tsx`: バックアップインポート・エクスポート
2. `project-manager-modal.tsx` はダイアログコンテナとビュー切り替えのみを担当（150行以内）。

## Acceptance Criteria & Verification Commands
- [x] 分割コンポーネントがすべて200行以内であること
- [x] プロジェクトの保存・読み込み・削除が正常に動作すること

### Verification
`rtk biome check src/features/tactical-unified/components/dialogs`
`pnpm type-check:scoped src/features/tactical-unified/components/dialogs/project-manager-modal.tsx`
