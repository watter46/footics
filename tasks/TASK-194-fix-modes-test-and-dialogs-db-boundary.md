# TASK-194: tactical-unified-page-modes テスト同期と Project Dialogs DB層境界解消

- **Status**: `DONE`
- **Commit**: `fix(tactical): align page modes test with full-bleed preview and route project dialogs through tactical-projects-service`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel — ファイル重複なし)
  - Wave 2: Phase 3, Phase 4 (parallel — Phase 2 完了後)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/panels/dialogs/): @/lib/db/tactical-projects-db`
  - `rg(src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx): findByText\(/Layout Mode/\)`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `TacticalSplitPreviewPanel` はヘッダー (`🎬 Layout Mode` / `Close Layout Mode`) を持たないフルブリード仕様であるため、モード切替の操作基点は `TopBarCenter` の `Toggle Layout Mode` ボタンとする。
  2. `.dependency-cruiser.cjs` の `no-component-direct-db-access` ルールに従い、`src/features/tactical-unified/panels/**` 配下から `src/lib/db/**` を直接 import しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `tactical-unified-page-modes.test.tsx` の第3テストは「`Toggle Layout Mode` 再クリックで board モードへ復帰し左右パネル状態が復元されること」、第4テストは `findByTestId('preview-container')` で Director モード到達を検証するよう現行仕様へ同期する。
  2. `src/lib/tactical/tactical-projects-service.ts` をサービス層ファサードとして新設し、`@/lib/db/tactical-projects-db` の全公開型・関数（`TacticalProjectSummary`, `listTacticalProjects`, `getTacticalProjectById`, `saveTacticalProject`, `createNewTacticalProject`, `renameTacticalProject`, `duplicateTacticalProject`, `deleteTacticalProject`, `deleteTacticalProjects`, `exportTacticalProjectToJson`, `exportTacticalProjectsAsZip`, `getMatchForTacticalProject`, `importMultipleTacticalProjects`, `importTacticalProjectFromJson`）を再エクスポートする。
  3. `panels/dialogs/*` 全 8ファイルの import 元を `@/lib/db/tactical-projects-db` から `@/lib/tactical/tactical-projects-service` へ置換する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/dialogs/{project-dialog-utils.ts,use-project-actions.ts,project-manager-modal.tsx,project-create-form.tsx,project-import-export.tsx,project-list-view.tsx,project-card.tsx,project-row.tsx}`

## 2. Implementation Phases

### Phase 1: tactical-unified-page-modes.test.tsx の現行フルブリード仕様同期
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` (L141-L210)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (L101-L118)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (L138-L148)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 第3テスト（L141-L176）: `Toggle Layout Mode` クリック後に `await screen.findByTestId('preview-container')` と `screen.queryByTestId('full-tactical-canvas') === null` を確認し、再度 `Toggle Layout Mode` ボタンをクリックして `full-tactical-canvas` 復帰・`preview-container` 非表示・左右パネル（`Tactical Phases` / `Formation`）復元を検証する（存在しない `/Layout Mode/` および `Close.*Layout` 検索を撤去する）。
    2. 第4テスト（L178-L209）: `await screen.findByText(/Layout Mode/)` を `await screen.findByTestId('preview-container')` に変更し、再クリックで `await screen.findByTestId('full-tactical-canvas')` が復帰することを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`:
    - `case 1`: 4テスト全件が `vitest` 単独実行・全体実行の両方で PASS する
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`

### Phase 2: サービス層新設と Dialog コア 3ファイルの DB 直接依存撤去
- **Target Files**:
  - `[ADD]` `src/lib/tactical/tactical-projects-service.ts` (~25 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts` (L1-L20)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/use-project-actions.ts` (L1-L20)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx` (L1-L20)
- **Reference Files (Read-Only)**:
  - `src/lib/db/tactical-projects-db.ts` (L27-L36, L296-L299)
  - `src/lib/tactical/tactical-storage.ts` (L13)
- **Contract**:
  ```ts
  // src/lib/tactical/tactical-projects-service.ts
  export type { TacticalProjectSummary } from '@/lib/db/tactical-projects-db';
  export {
    createNewTacticalProject,
    deleteTacticalProject,
    deleteTacticalProjects,
    duplicateTacticalProject,
    exportTacticalProjectsAsZip,
    exportTacticalProjectToJson,
    getMatchForTacticalProject,
    getTacticalProjectById,
    importMultipleTacticalProjects,
    importTacticalProjectFromJson,
    listTacticalProjects,
    renameTacticalProject,
    saveTacticalProject,
  } from '@/lib/db/tactical-projects-db';
  ```
  - 振る舞い仕様・境界条件:
    1. `project-dialog-utils.ts`, `use-project-actions.ts`, `project-manager-modal.tsx` の `@/lib/db/tactical-projects-db` import を `@/lib/tactical/tactical-projects-service` へ置換する。機能ロジックは一切変更しない。
- **Concrete Test Cases**:
  - `project-manager-modal.tsx` を描画する統合テスト（`tactical-unified-page-integration.test.tsx` case 2）で型・実行時エラーが出ないこと。
- **Verification**:
  - `bun run ai:check src/lib/tactical/tactical-projects-service.ts src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts src/features/tactical-unified/panels/dialogs/use-project-actions.ts src/features/tactical-unified/panels/dialogs/project-manager-modal.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`

### Phase 3: Dialog ビュー 4ファイルの DB 直接依存撤去
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-create-form.tsx` (L1-L25)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-import-export.tsx` (L1-L25)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-list-view.tsx` (L1-L20)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-card.tsx` (L1-L20)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/tactical-projects-service.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 対象 4ファイルの `@/lib/db/tactical-projects-db` import を `@/lib/tactical/tactical-projects-service` へ置換する。
- **Concrete Test Cases**:
  - `bun run ai:check` の Scoped tsc および Biome がエラー 0 で通ること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/dialogs/project-create-form.tsx src/features/tactical-unified/panels/dialogs/project-import-export.tsx src/features/tactical-unified/panels/dialogs/project-list-view.tsx src/features/tactical-unified/panels/dialogs/project-card.tsx`

### Phase 4: ProjectRow の DB 直接依存撤去
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-row.tsx` (L1-L20)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/tactical-projects-service.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `project-row.tsx` の `@/lib/db/tactical-projects-db` 型 import を `@/lib/tactical/tactical-projects-service` へ置換する。
- **Concrete Test Cases**:
  - `bun run ai:check src/features/tactical-unified/panels/dialogs/project-row.tsx` が PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/dialogs/project-row.tsx`
