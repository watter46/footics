# TASK-202m: DB / Storage / Import / PlayerMerge / Dialogs の Domain 型統一

- **Status**: `DONE`
- **Commit**: `refactor(tactical): unify DB, storage, import, player-merge, and project dialogs on DomainTacticalProject`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3, Phase 4
  - Wave 2 (sequential): Phase 5
- **Negative Contracts**:
  - `rg(src/lib/db/schema.ts,src/lib/db/tactical-projects-db.ts,src/lib/db/tactical-projects-import.ts,src/lib/db/player-merge.ts,src/lib/tactical/tactical-storage.ts,src/features/tactical-unified/panels/dialogs): ensureTacticalProject|\bTacticalProject\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. IndexedDB (`db.tactical_projects`)・アクティブプロジェクト保存・インポート・選手マージ・ダイアログ群はすべて `DomainTacticalProject` のみを入出力し、`ensureTacticalProject` を完全に撤去する。
  2. 外部入力や DB 内の既存データ（旧バージョン互換データ含む）を読み込む際は必ず ACL Translator `normalizeTacticalProject(raw).project` に通して `DomainTacticalProject` へ正規化する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `tactical-projects-db.ts` の `listTacticalProjects` 等のサマリー生成は、`normalizeTacticalProject(p).project` から `phases[0]` を参照して `slideCount`, `aspectRatio`, `backgroundType` を算出する。
  2. `saveTacticalProject` / `saveActiveProjectToDb` / `exportTacticalProjectToJson` の引数型は `DomainTacticalProject` のみに統一する（`TacticalProject | DomainTacticalProject` の二重型を廃止）。
  3. `player-merge.ts` の `updateTacticalProjectsPlayerIds` は `normalizeTacticalProject(p).project` で正規化し、`phases[].slides[].players` を更新する。
- **Consumers (同期更新対象)**:
  - `src/lib/db/schema.ts`, `tactical-projects-db.ts`, `tactical-projects-import.ts`, `player-merge.ts`
  - `src/lib/tactical/tactical-storage.ts`
  - `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts`, `project-create-form.tsx`
  - `tactical-storage.test.ts`, `tactical-projects-db.test.ts`, `tactical-projects-import.test.ts`

## 2. Implementation Phases

### Phase 1: DB Schema・Storage・`tactical-storage.test.ts` の Domain 型統一
- **Target Files**:
  - `[MODIFY]` `src/lib/db/schema.ts` (85 lines)
  - `[MODIFY]` `src/lib/tactical/tactical-storage.ts` (91 lines)
  - `[MODIFY]` `src/lib/tactical/__tests__/tactical-storage.test.ts` (91 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  ```ts
  // schema.ts: tactical_projects: Table<DomainTacticalProject, string>;
  // tactical-storage.ts:
  export async function saveActiveProjectToDb(project: DomainTacticalProject, matchId?: string | null): Promise<void>;
  export async function loadActiveProjectFromDb(matchId?: string | null): Promise<DomainTacticalProject | null>;
  ```
  - 振る舞い仕様・境界条件:
    1. `loadActiveProjectFromDb` は DB 値の存在・matchId 整合チェック後、`normalizeTacticalProject(val).project` を返す（不正データや空時は従来通り `null` を返すガードを維持）。
    2. `tactical-storage.test.ts` の `loaded?.slides` を `loaded?.phases[0].slides` へ更新する。
- **Concrete Test Cases**:
  - `tactical-storage.test.ts`: 永続化・復元、削除、不正データ時 `null`、matchId 汚染分離の全5テスト通過。
- **Verification**:
  - `bun run ai:check src/lib/db/schema.ts src/lib/tactical/tactical-storage.ts src/lib/tactical/__tests__/tactical-storage.test.ts`

### Phase 2: `tactical-projects-db.ts` & `tactical-projects-db.test.ts` の移行（大ファイル 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/db/tactical-projects-db.ts` (300 lines)
  - `[MODIFY]` `src/lib/db/__tests__/tactical-projects-db.test.ts` (155 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `factory.ts`
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  - `ensureTacticalProject` および `TacticalProject` を削除し、全関数入出力を `DomainTacticalProject` へ統一する。
  - `tactical-projects-db.test.ts` の `duplicated.slides` 等を `phases[0].slides` 参照へ更新する。
- **Concrete Test Cases**:
  - `tactical-projects-db.test.ts`: 作成・一覧・取得・リネーム・複製・削除・一括削除・複数インポート全通過。
- **Verification**:
  - `bun run ai:check src/lib/db/tactical-projects-db.ts src/lib/db/__tests__/tactical-projects-db.test.ts`

### Phase 3: Import 処理とプロジェクト Dialogs の Domain 型移行
- **Target Files**:
  - `[MODIFY]` `src/lib/db/tactical-projects-import.ts` (255 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts` (179 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/dialogs/project-create-form.tsx` (193 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `pitch-config.ts`
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  - `tactical-projects-import.ts`: `ensureTacticalProject` ➔ `normalizeTacticalProject`（バリデーションエラー時は詳細な issue path を投げる既存契約を維持）、返却型を `DomainTacticalProject` へ統一。
  - `project-dialog-utils.ts` / `project-create-form.tsx`: `TacticalProject` を `DomainTacticalProject`、境界線デフォルト取得を `pitch-config` へ変更。
- **Concrete Test Cases**:
  - Phase 5 の `tactical-projects-import.test.ts` で JSON インポート仕様を検証する。
- **Verification**:
  - `bun run ai:check src/lib/db/tactical-projects-import.ts src/features/tactical-unified/panels/dialogs/project-dialog-utils.ts src/features/tactical-unified/panels/dialogs/project-create-form.tsx`

### Phase 4: `player-merge.ts` の `ensureTacticalProject` 撤去（大ファイル 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/db/player-merge.ts` (300 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  - `ensureTacticalProject` import と呼び出しを撤去し、`normalizeTacticalProject(p).project` を通じて `phases[].slides[].players` の ID 置換を継続する。
- **Concrete Test Cases**:
  - 次タスクの `queries.test.ts`（`mergeLegacyPlayersAndPhotos` 関連ケース）で検証する。
- **Verification**:
  - `bun run ai:check src/lib/db/player-merge.ts`

### Phase 5: `tactical-projects-import.test.ts` の移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/db/__tests__/tactical-projects-import.test.ts` (374 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - `TacticalProject` 型参照を削除し、`imported.slides` アサーションを `imported.phases[0].slides` 検証へ更新する（レガシー JSON インポート時の `aspectRatio` / `endMarker` 正規化検証は維持）。
- **Concrete Test Cases**:
  - `tactical-projects-import.test.ts`: 全テストケース通過。
- **Verification**:
  - `bun run ai:check src/lib/db/__tests__/tactical-projects-import.test.ts`
