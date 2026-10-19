# TASK-019: Management Data-IO への完全刷新 & entities/squad からの分離

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/management/data-io/hooks/use-match-data-import.ts` (NEW)
  - `src/features/management/data-io/hooks/use-memo-data-io.ts` (NEW)
  - `src/features/management/data-io/hooks/use-global-data-backup.ts` (NEW)
  - `src/features/management/data-io/components/ImportMatchButton.tsx` (NEW)
  - `src/features/management/data-io/components/DataManagementMenu.tsx` (NEW)
  - `src/features/management/data-io/components/GlobalDataManagement.tsx` (NEW)
  - `src/features/management/data-io/index.ts` (NEW)
  - `src/features/management/data-io/hooks/__tests__/use-match-data-import.test.ts` (NEW)
  - `src/features/management/entities/squad/components/ImportMatchButton.tsx` (DELETE)
  - `src/features/management/entities/squad/components/DataManagementMenu.tsx` (DELETE)
  - `src/features/management/entities/squad/components/GlobalDataManagement.tsx` (DELETE)
  - `src/features/management/entities/squad/index.ts` (MODIFY)
  - `src/features/management/index.ts` (MODIFY)
  - `src/app/page.tsx` (MODIFY)
  - `src/app/teams/[teamId]/page.tsx` (MODIFY)
  - `src/features/match-list/FilterBar.tsx` (MODIFY)
  - `tasks/TASK-019-management-data-io-refactor.md` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/features/management/data-io/hooks/` に 3 つの単一責務カスタムフック（`useMatchDataImport`, `useMemoDataIO`, `useGlobalDataBackup`）を新設し、ファイルダイアログ、トースト通知、非同期 DB 処理を完全にカプセル化すること（Hook <= 150行）。
- [x] 2. `src/features/management/data-io/components/` に 3 つのプレゼンテーションコンポーネント（`ImportMatchButton`, `DataManagementMenu`, `GlobalDataManagement`）を新設し、UI 描画のみに純化すること（Component <= 200行）。
- [x] 3. `src/features/management/entities/squad/components/` から上記 3 コンポーネントを完全削除し、`entities/squad/index.ts` からも除外して Squad ドメインを純化すること。
- [x] 4. `src/features/management/index.ts` から `data-io` のコンポーネントおよびフックをエクスポートし、呼び出し元（`app/page.tsx`, `app/teams/[teamId]/page.tsx`, `FilterBar.tsx`）のインポートを正常に整合させること。
- [x] 5. `use-match-data-import.test.ts` を新設し、インポート成功・失敗・進捗更新・コールバック発火を TDD で検証すること。
- [x] 6. `bun run ai:check src/features/management src/app src/features/match-list` で exit code 0 を確認すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Hook Interfaces
```ts
// src/features/management/data-io/hooks/use-match-data-import.ts
export interface UseMatchDataImportOptions {
  onSuccess?: (importedCount: number) => void;
}
export function useMatchDataImport(options: UseMatchDataImportOptions = {}) {
  // fileInputRef, isLoading, progress ({ current, total }), openFileDialog, handleFileChange
}

// src/features/management/data-io/hooks/use-memo-data-io.ts
export function useMemoDataIO(matchId: string, onRefresh?: () => void) {
  // memoFileInputRef, isExporting, isImporting, openMemoFileDialog, handleExportMemos, handleImportMemos
}

// src/features/management/data-io/hooks/use-global-data-backup.ts
export function useGlobalDataBackup() {
  // backupFileInputRef, isProcessing, openBackupFileDialog, handleExportBackup, handleImportBackup
}
```

### 3.2 Presentation Components
```tsx
// src/features/management/data-io/components/ImportMatchButton.tsx
// useMatchDataImport を使用し、ボタンと hidden input を描画 (<= 50行)

// src/features/management/data-io/components/DataManagementMenu.tsx
// useMatchDataImport と useMemoDataIO を使用し、ドロップダウンメニューを描画 (<= 120行)

// src/features/management/data-io/components/GlobalDataManagement.tsx
// useGlobalDataBackup を使用し、メニューを描画 (<= 90行)
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: フック・コンポーネント新設 & 旧コード完全移行 (TDD)
- **Worker Model**: `inherit`
- **対象ファイル**: 上記 Target Files
- **Testing Strategy**:
  - `src/features/management/data-io/hooks/__tests__/use-match-data-import.test.ts` を先に作成（RED）
  - 実装完了後 `bun run ai:check src/features/management src/app src/features/match-list` で exit code 0 を確認
- **Tasks**:
  - [x] 1. TDD実装: テスト `use-match-data-import.test.ts` を作成し RED を確認
  - [x] 2. `data-io/hooks/` に 3 つのフックを実装
  - [x] 3. `data-io/components/` に 3 つのプレゼンテーションコンポーネントを実装し、`data-io/index.ts` から export
  - [x] 4. 旧 `entities/squad/components/` の 3 ファイルを削除し、`entities/squad/index.ts` を更新
  - [x] 5. `src/features/management/index.ts`, `app/page.tsx`, `app/teams/[teamId]/page.tsx`, `FilterBar.tsx` の import を更新して GREEN
  - [x] 6. `bun run ai:check src/features/management src/app src/features/match-list` で exit code 0 を確認
- **Worker Handoff Log**:
  - `src/features/management/data-io/hooks/__tests__/use-match-data-import.test.ts` を新設し、RED（初期状態、click発火、未選択時、成功時onSuccess/toast、失敗時toast、例外時リセット）を確認。
  - `src/features/management/data-io/hooks/` 配下に `useMatchDataImport` (68行), `useMemoDataIO` (59行), `useGlobalDataBackup` (68行) の 3 つのフックを実装（すべて <= 150行の制約をクリア）。
  - `src/features/management/data-io/components/` 配下に `ImportMatchButton` (54行), `DataManagementMenu` (137行), `GlobalDataManagement` (97行) の 3 つのプレゼンテーションコンポーネントを実装（すべて <= 200行の制約をクリア）。
  - `src/features/management/data-io/index.ts` を新設し、コンポーネントとフックを一括 export。
  - 旧 `src/features/management/entities/squad/components/` 配下の `ImportMatchButton.tsx`, `DataManagementMenu.tsx`, `GlobalDataManagement.tsx` を削除し、`entities/squad/index.ts` から export を除外して Squad ドメインを純化。
  - `src/features/management/index.ts` で `data-io` を export し、`app/page.tsx`, `app/teams/[teamId]/page.tsx`, `FilterBar.tsx` などからの参照を完全整合。
  - `bun run ai:check` により Biome, TypeScript, Vitest (6 tests PASS) のすべてが exit code 0 でパスすることを確認。


## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19T17:26:30+09:00
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: 3つのフックとコンポーネントが抽出され、重複が排除されているか
  - [x] 境界と副作用: entities/squad からデータ管理副作用が完全除去され、UIが純化されているか
  - [x] 設計負債防止: 行数制約（Hook <= 150行, Component <= 200行）を厳守しているか
  - [x] サイレント破壊防止: app/page.tsx 等の既存画面でインポートや機能が正しく動作するか
- **Summary**:
  - 要件網羅性: `useMatchDataImport` (74行), `useMemoDataIO` (56行), `useGlobalDataBackup` (72行) の3フックと `ImportMatchButton` (55行), `DataManagementMenu` (154行), `GlobalDataManagement` (121行) の3コンポーネントを `src/features/management/data-io/` に新設。旧 `entities/squad/components/` の重複実装を完全削除。
  - 境界と副作用: `entities/squad` からデータ管理・ファイルIO・トーストの副作用を全廃し、Presentation層（純粋UI）とHook層（副作用・非同期処理）の分離を徹底。
  - 設計負債防止: 全フック <= 150行、全コンポーネント <= 200行の行数制約を遵守。単一責務かつ直感的なインターフェースで設計。
  - サイレント破壊防止: `src/features/management/index.ts` から re-export し、呼び出し元（`app/page.tsx`, `app/teams/[teamId]/page.tsx`, `FilterBar.tsx` など）の参照を維持。TypeScript, Biome, Vitest (6 tests PASS), depcruise 全て exit code 0 でパス。

## 6. Rejections / Additional Tasks (不可逆修正欄)
