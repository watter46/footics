# TASK-190b: 適応型 Read ガード（150行構造先行ゲート）と監査検出器の刷新

- **Status**: `DONE`
- **Commit**: `refactor(agents): enforce 150-line structure-first read guard and update audit detectors`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 4 (parallel — Planner 直接実装、Worker 委譲不可)
  - Wave 2: Phase 3, Phase 5 (sequential after Wave 1 — Planner 直接実装)
- **Negative Contracts**:
  - `rg(.agents/hooks,.agents/scripts): SMALL_FILE_LINE_LIMIT|ai:find|ai:outline|repo_summary|repo_map|READ-01|detectSmallSliced`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. **非対称ゲート原則**: Planner / Architect の 150行超コード（`src/`, `extension/`, `tests/`, `scripts/`）の「事前構造確認なし丸読み」のみ物理遮断し、`StartLine`/`EndLine` 範囲指定・150行以下・`tasks/`/`notes/`/`.agents/`/`docs/`・Worker 担当ファイルは妨げない。
  2. **強制全文書き換えの完全撤廃**: `SMALL_FILE_LINE_LIMIT` による `overwrite` を削除し、エージェントが意図的に指定したスライス読込を尊重する。
  3. **既存保護ガードの維持**: `.system_generated/tasks/*.log` 許可、ログ/`rtk/tee/` 100行制限、Ghost Path Guard、連続ページ送り `>= 3` 遮断は維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 構造先行確認の判定は、直近 `USER_INPUT` 以降の `run_command` 履歴から `ai:peek` / `ai:impact` / `rg` / `rtk grep` / `ast-grep` の実行を対象とし、コマンド文字列に対象ファイルパス・ベース名・親ディレクトリ（`ai:peek <dir>` 時）のいずれかが含まれれば調査済みとみなす。
  2. `reading.ts` は `READ-01 (SMALL_SLICED)` を廃止し、`READ-03` を 150行超へ引き下げ、`READ-11 (COMPACT_LOOP_ALERT)` を追加して `READING_DETECTORS` 計 10 個を維持する。
  3. ガード警告文の旧表現（`ai:outline`, `ai:find`, `view_file`, `replace_file_content`, `write_to_file`, `ai:reviewer:check`）を現行ツール名（`ai:peek`, `ai:impact`, `read_file`, `edit_file`, `write_file`）へ統一する（ただし `isReadTool` 等での旧ツール名入力パース互換は履歴監査・テスト用に維持する）。
- **Consumers (同期更新対象)**:
  - `.agents/hooks/guard/view-filter.ts`, `architect-guard.ts`, `auditor-guard.ts`, `safety-filter.ts`, `token-filter.ts`, `subagent-guard.ts`
  - `.agents/scripts/lib/audit/detectors/reading.ts`, `exploration.ts`, `session-report.ts`, `audit-session.ts`

## 2. Implementation Phases

### Phase 1: `view-filter.ts` 適応型 Read ガード刷新とテスト更新
- **Target Files**:
  - `[MODIFY]` `.agents/hooks/guard/view-filter.ts` (checkViewGuard, L13-L334)
  - `[MODIFY]` `.agents/hooks/guard/view-filter.test.ts` (L463-L657)
- **Reference Files (Read-Only)**:
  - `.agents/hooks/guard/agent-access-guard.ts`
  - `.agents/hooks/guard/transcript-calls.ts`
- **Contract**:
  ```ts
  export const STRUCTURE_GATE_LINE_LIMIT = 150;
  export function hasPriorStructureProbe(
    transcriptPath: string | undefined,
    resolvedPath: string,
    workspacePath?: string,
  ): boolean;
  ```
  - 振る舞い仕様・境界条件:
    1. `SMALL_FILE_LINE_LIMIT` と `overwrite: { StartLine: 1, EndLine: totalLines }` 書き換えを削除する。
    2. `totalLines > STRUCTURE_GATE_LINE_LIMIT && hasSlice` の場合に `countPagedSliceChain >= MAX_SEQUENTIAL_SLICES` なら遮断し、案内文に `ai:peek` と `ai:impact` を出す。
    3. `detectAgentRole(payload.transcriptPath)` が `'planner'` または `'architect'` かつ `isInvestigationTarget(relPath)` が `true` かつ `totalLines > STRUCTURE_GATE_LINE_LIMIT` かつ `!hasSlice` の場合:
       - `hasPriorStructureProbe`（直近 `USER_INPUT` 以降で `ai:peek` / `ai:impact` / `rg` / `rtk grep` / `ast-grep` に対象の相対パス・解決パス・ベース名が含まれるか、または `ai:peek` の引数に対象の親ディレクトリが含まれるか）が `false` なら `decision: 'deny'`（案内文に `bun run ai:peek ${rawPath}` と `StartLine/EndLine` を提示）を返す。
    4. Ghost Path Guard 案内文を `bun run ai:impact <symbol>` / `fd -t f <pattern>` に更新する。
- **Concrete Test Cases**:
  - `.agents/hooks/guard/view-filter.test.ts`:
    - `case 1`: 400行以下ファイルへの `StartLine: 10, EndLine: 30` が `overwrite` なしで `{ decision: 'allow' }` になること
    - `case 2`: Planner で 151行以上の `src/foo.ts` を事前探索なし丸読みすると `deny` になること
    - `case 3`: 同条件で事前 `bun run ai:peek src/foo.ts` 実行後、または `StartLine: 10, EndLine: 50` 指定時は `allow` になること
    - `case 4`: Worker では 250行の `src/foo.ts` の丸読みが `allow` になること
    - `case 5`: `tasks/**`, `notes/**`, `.agents/**`, `docs/**` および 150行以下の `src/small.ts` は事前探索なし丸読みでも `allow` になること
- **Verification**:
  - `bun test .agents/hooks/guard/view-filter.test.ts`

### Phase 2: `architect-guard.ts`・`auditor-guard.ts` ホワイトリスト更新
- **Target Files**:
  - `[MODIFY]` `.agents/hooks/guard/architect-guard.ts` (ALLOWED_BUN_SCRIPTS, L22-L72)
  - `[MODIFY]` `.agents/hooks/guard/architect-guard.test.ts` (L130-L156)
  - `[MODIFY]` `.agents/hooks/guard/auditor-guard.ts` (ALLOWED_BUN_SCRIPTS, L29-L165)
- **Reference Files (Read-Only)**:
  - `.agents/hooks/guard/architect-guard.ts`
  - `.agents/hooks/guard/auditor-guard.ts`
- **Contract**:
  - `ALLOWED_BUN_SCRIPTS` から `'ai:outline'`, `'ai:find'`, `'scripts/map/find-symbol.ts'`, `'scripts/ast/extract-types.ts'`, `'.agents/scripts/outline.ts'` を削除し、`'ai:peek'`, `'ai:impact'`, `'.agents/scripts/peek.ts'`, `'.agents/scripts/impact.ts'` を登録する。
  - 両ファイルの deny メッセージから `ai:outline` / `ai:find` を `ai:peek` / `ai:impact` へ置換する。
- **Concrete Test Cases**:
  - `.agents/hooks/guard/architect-guard.test.ts`:
    - `case 1`: `bun run ai:peek src/components/Stage.tsx` および `bun run ai:impact Stage` が許可（`null`）されること
    - `case 2`: 廃止済み `bun run ai:outline src/a.ts` と `bun run ai:find Stage` が `deny` になること
- **Verification**:
  - `bun test .agents/hooks/guard/architect-guard.test.ts`

### Phase 3: 残余ガード文言整理と `guard.test.ts` 同期
- **Target Files**:
  - `[MODIFY]` `.agents/hooks/guard/safety-filter.ts` (L48-L95)
  - `[MODIFY]` `.agents/hooks/guard/token-filter.ts` (L70-L255)
  - `[MODIFY]` `.agents/hooks/guard/subagent-guard.ts` (L70-L76)
  - `[MODIFY]` `.agents/hooks/guard.test.ts` (L119-L364, L846-L865)
- **Reference Files (Read-Only)**:
  - `.agents/hooks/guard/view-filter.ts`
- **Contract**:
  - `safety-filter.ts` / `token-filter.ts` / `subagent-guard.ts` のユーザー向け `reason` 文字列から旧名（`ai:outline`, `view_file`, `replace_file_content`, `write_to_file`, `ai:reviewer:check`）を現行名（`ai:peek`, `ai:impact`, `read_file`, `edit_file`, `write_file`）へ統一する（`token-filter.ts` の `ai:reviewer:check` 実行ブロック `if` 条件自体は維持し、エラー文言のみ現行化する）。
  - `guard.test.ts` L265-363 の `SMALL_FILE_LINE_LIMIT` 自動 `overwrite` 期待値を「`overwrite` なしで `allow`」へ更新し、L850 の `ai:outline` を `ai:peek` へ更新する。
- **Concrete Test Cases**:
  - `.agents/hooks/guard.test.ts`: `bun test .agents/hooks/guard.test.ts` 全件 PASS
- **Verification**:
  - `bun test .agents/hooks/guard.test.ts`

### Phase 4: 監査検出器 `reading.ts` 刷新（`READ-01` 廃止・`READ-03` 150行・`READ-11` 追加）
- **Target Files**:
  - `[MODIFY]` `.agents/scripts/lib/audit/detectors/reading.ts` (L15-L200, L432, L572-L583)
  - `[MODIFY]` `.agents/scripts/__tests__/audit-detectors-reading.test.ts` (L1-L197, L535-L537)
- **Reference Files (Read-Only)**:
  - `.agents/scripts/lib/audit/types.ts`
  - `.agents/scripts/audit-session.ts`
- **Contract**:
  ```ts
  export const detectCompactLoopAlert: Detector;
  ```
  - 振る舞い仕様・境界条件:
    1. `detectSmallSliced` (`READ-01`) を削除し、`READING_DETECTORS` から外す。
    2. `detectSeqSlicing` (`READ-02`) は `Sequential slice paging blocked` と `Sequential slicing loop` の両方を検知する。
    3. `detectLargeFullBlind` (`READ-03`) の閾値を `150` 行超へ変更し、`peek` / `impact` / `ai:peek` / `ai:impact` / `ast-grep` / `rg` / `grep` / `find` を事前調査コマンドとして認識する（`:Symbol` 付記トークンもファイル名抽出して照合）。
    4. `detectReadUnused` (`READ-09`) の除外条件から `repo_summary` 特別扱いを削除する。
    5. `detectCompactLoopAlert` (`READ-11`, `COMPACT_LOOP_ALERT`) を新設: `PLANNER_RESPONSE` を走査し、直前ターンの `cache_read_tokens >= 80_000` から次ターンで `cache_read_tokens <= prev * 0.5`（50%超急落）が発生した場合に検知する（2回以上または `prev >= 150_000` なら `HIGH`、それ以外は `MED`、`layers: ['planner']`）。
- **Concrete Test Cases**:
  - `.agents/scripts/__tests__/audit-detectors-reading.test.ts`:
    - `case 1`: `READ-03` が 151行超の未調査丸読みを検知し、事前 `bun run ai:peek` 実行時は 0件になること
    - `case 2`: `READ-11` が `cache_read_tokens` 160K ➔ 20K 急落を `COMPACT_LOOP_ALERT` (`HIGH`) として検知し、通常の漸増時は 0件になること
    - `case 3`: `READING_DETECTORS.length === 10`（`READ-02`〜`READ-11`）
- **Verification**:
  - `bun test .agents/scripts/__tests__/audit-detectors-reading.test.ts`

### Phase 5: `exploration.ts`・`session-report.ts`・`audit-session.ts` 更新
- **Target Files**:
  - `[MODIFY]` `.agents/scripts/lib/audit/detectors/exploration.ts` (detectOutlineBypass, detectBadFirstMove, L8-L140)
  - `[MODIFY]` `.agents/scripts/__tests__/audit-detectors-exploration.test.ts` (L18-L200)
  - `[MODIFY]` `.agents/scripts/session-report.ts` (isReadOnly, L102-L119)
  - `[MODIFY]` `.agents/scripts/audit-session.ts` (detectSubagentContracts, L360-L370)
- **Reference Files (Read-Only)**:
  - `.agents/scripts/__tests__/session-report.test.ts`
  - `.agents/scripts/__tests__/audit-session.test.ts`
- **Contract**:
  - `exploration.ts`: `EXP-01`（`detectOutlineBypass`）および `EXP-02`（`detectBadFirstMove`）の探索コマンド判定を `ai:peek` / `ai:impact` / `ast-grep` / `rg` / `tasks/TASK-*.md` / `notes/*.md` 基準へ更新する（`repo_summary.txt`・`ai:find`・`ai:outline` 依存を除去）。
  - `session-report.ts`: `isReadOnly` の特別許可判定を `ai:peek`, `ai:impact`, `ast-grep`, `rg` へ更新する。
  - `audit-session.ts`: `detectSubagentContracts` のトークン削減ルール判定を `efficient-exploration` / `トークン` / `150行` / `ai:peek` / `ai:impact` へ更新する。
- **Concrete Test Cases**:
  - `.agents/scripts/__tests__/audit-detectors-exploration.test.ts`:
    - `case 1`: `EXP-01` が `bun run ai:peek` または `bun run ai:impact` 使用時に 0件になること
    - `case 2`: `EXP-02` が初手 `bun run ai:peek` / `bun run ai:impact` / `notes/*.md` 読込時に 0件になり、無探索でのソース直読時に発火すること
- **Verification**:
  - `bun test ./.agents`
