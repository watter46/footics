# TASK-190c: 探索ルール唯一正本化と Agents / Skills 記述の一掃

- **Status**: `DONE`
- **Commit**: `docs(agents): unify efficient-exploration SSOT and purge legacy tool references`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel — Planner 直接実装、Worker 委譲不可)
  - Wave 2: Phase 3, Phase 4 (parallel — Planner 直接実装)
- **Negative Contracts**:
  - `rg(.agents/rules,.agents/agents,.agents/skills,AGENTS.md): ai:find|ai:outline|repo_summary|repo_map|ai:reviewer:check|agent:check-worker`
  - `rg(.agents/skills,.agents/rules,.agents/agents): \bview_file\b|\breplace_file_content\b|\bwrite_to_file\b`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. **Single Source of Truth**: 探索・Read パイプラインと禁止コマンドの詳細は `.agents/rules/efficient-exploration.md`（`trigger: always_on`）のみに置き、`AGENTS.md`・`.agents/agents/*.md`・`.agents/skills/*.md` へ手順を再列挙しない。
  2. **2階層体制・現行ツール名の統一**: 旧3階層（`Scout` / `Reviewer` / Flash委譲）および旧ツール名（`view_file`, `replace_file_content`, `write_to_file`, `ai:find`, `ai:outline`, `repo_summary`, `repo_map`, `agent:check-worker`, `ai:reviewer:check`）を完全に一掃する。
  3. **Rule Frontmatter の整合維持**: `efficient-exploration.md` は `trigger: always_on`、他 `.agents/rules/*.md` は `globs:` を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `.agents/rules/efficient-exploration.md` は 35行以内（frontmatter 除く本文または全体でコンパクト）に凝縮し、「① 構造・影響範囲特定（`ai:impact`, `rg -l`, `ai:peek`）➔ ② 150行超の事前構造確認ゲート＆範囲指定 `read_file` ➔ ③ 禁止事項（`sed`/`awk`/`wc`/`tail`/`git log -p`）＆ Command Map」を唯一正本として定義する。
  2. `.agents/skills/large-codebase-research/SKILL.md` は「旧 Flash モデルサブエージェント ➔ Pro モデル」構成を廃止し、「Planner/Architect が `ai:impact` + `ai:peek` + `rg -l` で調査し、`notes/research-<topic>.md`（調査カプセル：構造・Consumers・行アンカー・設計制約）へ蒸留 ➔ セッションを閉じて新セッションで `/plan @notes/research-<topic>.md` へ引き継ぐ」ワークフローへ全面刷新する。
  3. `.agents/skills/agent-self-evaluation/SKILL.md` は旧 Reviewer 引き渡し・`agent:check-worker` 前提を「Worker が `bun run ai:check <files>` 通過後に Planner へ `TASK_COMPLETE` 報告する前の自己点検プロトコル」へ刷新する。
- **Consumers (同期更新対象)**:
  - `AGENTS.md`, `.agents/rules/efficient-exploration.md`, `.agents/rules/agent-delegation.md`
  - `.agents/agents/planner.md`, `brainstormer.md`, `tactical-architect.md`, `auditor.md`
  - `.agents/skills/{large-codebase-research,writing-plans,brainstorming,systematic-debugging,knowledge-integration,session-audit,agent-self-evaluation}/SKILL.md`

## 2. Implementation Phases

### Phase 1: `AGENTS.md` と Rules の正本統合
- **Target Files**:
  - `[MODIFY]` `AGENTS.md` (L1-L47)
  - `[MODIFY]` `.agents/rules/efficient-exploration.md` (全体刷新、35行以内)
  - `[MODIFY]` `.agents/rules/agent-delegation.md` (L35)
- **Reference Files (Read-Only)**:
  - `notes/brainstorm-exploration-redesign.md`
- **Contract**:
  - `AGENTS.md`: コア原則1を「探索手順の正本は `.agents/rules/efficient-exploration.md` とし、150行超コードの事前構造確認なし丸読みを物理遮断する」旨の簡潔記述へ改訂（個別コマンド列挙を除去）。
  - `.agents/rules/efficient-exploration.md`: `trigger: always_on` を維持し、35行以内で以下を唯一正本として記述する：
    1. 探索パイプライン：`bun run ai:impact <symbol|file>` ➔ `rg -l '<symbol>' src/ extension/` ➔ `bun run ai:peek <file|dir> [Symbol]` ➔ `read_file`（150行以下は一括、150行超は事前 `ai:peek`/`ai:impact`/`rg` 必須＋`StartLine`/`EndLine` 範囲指定推奨、連続3回ページ送り禁止）。
    2. 禁止コマンド・品質ガード：`sed`/`awk`/`cut`/`wc`/`tail`/`git log -p` 禁止、Ghost Path 禁止、編集前無加工 `read_file` 必須。
    3. Command Map 表：`ai:impact`, `ai:peek`, `rg -l`, `rtk grep`, `ai:check`, `ai:preflight`, `ai:commit`, `task:validate`, `bun test ./.agents`。
  - `.agents/rules/agent-delegation.md`: L35 の `(ai:outline / rg -l / read_file)` を `(ai:impact / ai:peek / rg -l / read_file)` へ更新する。
- **Concrete Test Cases**:
  - `efficient-exploration.md` の行数が 35行以内であること。
  - `rg` による Negative Contracts が 0件ヒットであること。
- **Verification**:
  - `bun run task:validate tasks/TASK-190c-exploration-rules-skills-agents-cleanup.md`

### Phase 2: Agent 定義（4ファイル）の重複排除・最新化
- **Target Files**:
  - `[MODIFY]` `.agents/agents/planner.md` (L46-L66)
  - `[MODIFY]` `.agents/agents/brainstormer.md` (L28-L35)
  - `[MODIFY]` `.agents/agents/tactical-architect.md` (L46-L50)
  - `[MODIFY]` `.agents/agents/auditor.md` (L50-L76)
- **Reference Files (Read-Only)**:
  - `.agents/rules/efficient-exploration.md`
- **Contract**:
  - `planner.md`: 「1. 事前調査」から旧コマンド列挙と400行ルールを削除し、「`.agents/rules/efficient-exploration.md` に従い `ai:impact` / `ai:peek` / `rg -l` で最小探索する」＋ Planner 固有の停止条件（大規模リファクタ時は `notes/research-<topic>.md` へ蒸留してセッション分離）を記載する。
  - `brainstormer.md`: L30 の探索コマンド列挙を「`.agents/rules/efficient-exploration.md` に従い `ai:impact` / `ai:peek` / `rg -l` と範囲指定 `read_file` で最小限の裏取りを行う」へ更新する。
  - `tactical-architect.md`: L47, L50 の `ai:outline`, `ai:find` を `ai:peek`, `ai:impact` へ更新する。
  - `auditor.md`: L53 の旧世代例示文（「旧ツール名」等）を具体旧識別子文字列を含まない一般表現へ改め、L73 の `ai:outline` を `ai:peek` / `ai:impact` へ更新する。
- **Concrete Test Cases**:
  - `.agents/agents/*.md` に対して Negative Contracts の `rg` パターンが 0件ヒットであること。
- **Verification**:
  - `bun test ./.agents`

### Phase 3: 調査・設計系 Skills（3ファイル）の全面刷新
- **Target Files**:
  - `[MODIFY]` `.agents/skills/large-codebase-research/SKILL.md` (全面刷新)
  - `[MODIFY]` `.agents/skills/writing-plans/SKILL.md` (L22-L33)
  - `[MODIFY]` `.agents/skills/brainstorming/SKILL.md` (L18-L38)
- **Reference Files (Read-Only)**:
  - `.agents/rules/efficient-exploration.md`
- **Contract**:
  - `large-codebase-research/SKILL.md`: 旧 Flash/Pro・`scratch/research-candidates.md` を廃止し、「大規模リファクタリング前の調査カプセル分離ワークフロー」へ全面刷新する：
    1. 調査フェーズ：`ai:impact`（定義元・Consumers・関連テスト）➔ `ai:peek`（構造・行範囲）➔ 必要最小行範囲の `read_file`。
    2. 蒸留出力：`notes/research-<topic>.md`（変更対象・Consumers全件・公開型/行アンカー・不変条件・廃止対象）のみを書き出し、生ログ貼り付け禁止。
    3. セッション境界：調査完了後にセッションを閉じ、新規セッションで `/plan @notes/research-<topic>.md` へ引き継ぐ。
  - `writing-plans/SKILL.md`: L22-L32 の探索プロトコルを `.agents/rules/efficient-exploration.md` 参照（`ai:impact` / `ai:peek` / 150行基準・範囲指定 `read_file`）へ置換する。
  - `brainstorming/SKILL.md`: L19, L36 の `ai:find` / `ai:outline` を `ai:impact` / `ai:peek` へ更新する。
- **Concrete Test Cases**:
  - 3ファイルに対して Negative Contracts の `rg` パターンが 0件ヒットであること。
- **Verification**:
  - `bun test ./.agents`

### Phase 4: デバッグ・知識統合・監査・自己評価 Skills（4ファイル）の一掃
- **Target Files**:
  - `[MODIFY]` `.agents/skills/systematic-debugging/SKILL.md` (L58-L76)
  - `[MODIFY]` `.agents/skills/knowledge-integration/SKILL.md` (L23-L25)
  - `[MODIFY]` `.agents/skills/session-audit/SKILL.md` (L70-L120)
  - `[MODIFY]` `.agents/skills/agent-self-evaluation/SKILL.md` (L1-L62)
- **Reference Files (Read-Only)**:
  - `.agents/scripts/lib/audit/detectors/reading.ts`
  - `.agents/scripts/lib/audit/detectors/exploration.ts`
- **Contract**:
  - `systematic-debugging/SKILL.md`: `agent:check-worker` を `bun run ai:check <対象ファイル群>` へ更新する。
  - `knowledge-integration/SKILL.md`: `view_file` を `read_file` へ更新する。
  - `session-audit/SKILL.md`: 検出器一覧表の `EXP-01`, `EXP-02`, `READ-01`（廃止）〜`READ-11`（`COMPACT_LOOP_ALERT`）および原因層説明を `TASK-190b` の実コード仕様と一致させ、`ai:outline`/`ai:find`/`repo_summary.txt`/`400行` 表記を一掃する。
  - `agent-self-evaluation/SKILL.md`: 旧 Reviewer 引き渡し・`agent:check-worker`・`Self-Evaluation Scorecard` 出力例を、現行2階層（Worker が `bun run ai:check <files>` 通過後に Planner へ `TASK_COMPLETE` を報告する前の自己点検チェックリスト）へ全面刷新する。
- **Concrete Test Cases**:
  - `bun run task:validate --verify-contracts tasks/TASK-190c-exploration-rules-skills-agents-cleanup.md` が PASS すること。
  - `bun test ./.agents` が全件 PASS すること。
- **Verification**:
  - `bun run ai:commit`
