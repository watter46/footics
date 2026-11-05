# TASK-159: Agent Layer v2 Overhaul

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-05
- **Target Files**:
  - `.agents/hooks/guard/task-size-guard.ts` (MODIFY)
  - `.agents/hooks/guard/task-size-guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/token-filter.ts` (MODIFY)
  - `.agents/hooks/guard.test.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.ts` (MODIFY)
  - `.agents/hooks/guard/view-filter.test.ts` (MODIFY)
  - `scripts/task/new-task.ts` (MODIFY)
  - `scripts/task/validate-task.ts` (MODIFY)
  - `scripts/task/__tests__/new-task.test.ts` (MODIFY)
  - `scripts/task/__tests__/validate-task.test.ts` (MODIFY)
  - `.agents/skills/writing-plans/SKILL.md` (MODIFY)
  - `.agents/skills/brainstorming/SKILL.md` (MODIFY)
  - `.agents/agents/planner.md` (MODIFY)
  - `.agents/agents/brainstormer.md` (MODIFY)
  - `.agents/agents/reviewer.md` (MODIFY)
  - `.agents/agents/worker.md` (MODIFY)
  - `AGENTS.md` (MODIFY)
  - `.agents/rules/agent-communication.md` (MODIFY)
  - `.agents/rules/agent-delegation.md` (MODIFY)
  - `.agents/rules/efficient-exploration.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `task-size-guard.ts` から `MAX_TASK_LINES = 250` 制限を撤廃し、「既存ファイルが `Status: \`DONE\`` の場合の新規 Phase 追記」「1 Phase 内の対象ファイル数が6個（プロダクション4＋テスト2）超」「6 Phase 以上の定義」のみを遮断すること。
- [x] 2. `token-filter.ts` で `git show`/`branch`/`stash`/`worktree` を `rtk git <subcmd>` に、`git grep` を `rtk grep` に変換し、`strings`/`nl`/`tac`/`od`/`xxd`/`base64`/`wc` を deny し、74行目の `.agents/tasks` を `tasks/` に修正し、`git log -p` エラー文内の案内を `rtk git show <hash> -- <file>` に更新すること。
- [x] 3. `view-filter.ts` の `extractReadTargetsFromCommand` で `git show <rev>:<path>`（および `rtk git show <rev>:<path>`）形式の `<path>` を抽出対象に追加すること。
- [x] 4. `new-task.ts`, `validate-task.ts`, `writing-plans/SKILL.md`, `brainstorming/SKILL.md` に `## 2.5 Architectural Invariants & Why`、250行制限撤廃（1 Phase最大4ファイル・15ファイル超は連番分割）、Exact Contract / Concrete Test Values 必須化、誤パス `.agents/rules/plan-artifact.md` 修正を反映すること。
- [x] 5. `planner.md`, `brainstormer.md`（`model: pro` 昇格・自己完結型プロンプト出力・迎合禁止 Anti-Sycophancy）、`reviewer.md`（ドメイン論理・Invariants破壊・Consumer更新漏れ監査追加）、`worker.md`（Invariants確認義務）を更新すること。
- [x] 6. `agent-communication.md` の `bun run agent:check-worker` を `bun run ai:check <ファイル>` に修正し、`AGENTS.md`, `agent-delegation.md`, `efficient-exploration.md` から250行制限記述を撤廃・重複説明を圧縮し、`bun test ./.agents` 及び `bun run task:validate` が全件 PASS すること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (不変条件)**:
  1. 既存のガードテスト（`bun test ./.agents`）および `bun run task:validate` が新仕様と完全整合し全件 PASS すること（既存の過去タスクファイル検証で後方互換エラーを起こさないこと）。
  2. Worker (`flash`) が推論や自律探索なしで実装できるよう、タスクファイルの情報量（Invariants・計算式・具体テスト値）を削らせないこと。
  3. 1 Phase あたり Worker が編集するプロダクションファイルは最大4ファイル（テスト含め最大6ファイル）を上限とすること。
- **Consumers (呼び出し元・同期確認リスト)**:
  - `.agents/hooks/pre-tool-use.ts` / `.agents/hooks/guard.test.ts`（ガード関数のシグネチャ `GuardDecision | null` を維持）
  - `scripts/ai/commit.ts` / `package.json`（`validateTaskFile` の公開インターフェースを維持）

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { checkTaskSizeGuard, type GuardDecision } from "./guard/task-size-guard";
import { extractReadTargetsFromCommand } from "./guard/view-filter";
import { generateTaskScaffold, type TaskScaffoldOptions } from "./new-task";
import { validateTaskFile, type ValidationResult } from "./validate-task";
```

### 3.2 Key Interfaces & Types
```ts
export interface GuardDecision {
  decision: "allow" | "deny";
  reason?: string;
  updatedCommand?: string;
}
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  taskPath: string;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
export function checkTaskSizeGuard(toolName: string, toolInput: Record<string, unknown>): GuardDecision | null {
  // tasks/TASK-*.md への書き込み時に Phase 数・1 Phase あたりファイル数(<=6)・DONE追記をチェック
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: フック・ガードの改修（250行制限撤廃・抜け道封鎖）
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/hooks/guard/task-size-guard.ts`, `.agents/hooks/guard/task-size-guard.test.ts`, `.agents/hooks/guard/token-filter.ts`, `.agents/hooks/guard.test.ts`, `.agents/hooks/guard/view-filter.ts`, `.agents/hooks/guard/view-filter.test.ts`
- **契約 (Interface)**:
  ```ts
  // task-size-guard.ts: MAX_TASK_LINES=250 撤廃。MAX_TASK_PHASES = 5, MAX_PHASE_FILES = 6。
  // 1) 既存ファイル(または更新前内容)が Status: `DONE` かつ Phase 見出し追加時 deny
  // 2) Phase 総数 > 5 で deny
  // 3) 各 Phase セクション内の「対象ファイル」行のバッククォートファイル数が > 6 で deny
  // token-filter.ts: git (show|branch|stash|worktree) -> rtk git $1, git grep -> rtk grep
  //   strings, nl, tac, od, xxd, base64, wc を deny。74行目の .agents/tasks -> tasks/。
  //   git log -p deny メッセージ内の git show を rtk git show <hash> -- <file> に修正。
  // view-filter.ts: extractReadTargetsFromCommand で (?:rtk\s+)?git\s+show\s+[^\s:]+:([^\s"';&|]+) から <path> を抽出。
  ```
- **Testing Strategy**:
  - `task-size-guard.test.ts`: 300行・3 Phaseのタスク ➔ `null` (allow)、6 Phase ➔ `deny`、1 Phaseに対象ファイル7個 ➔ `deny`、既存 `Status: \`DONE\`` ファイルへの新規 Phase 追加 ➔ `deny`。
  - `guard.test.ts`: `git show HEAD` ➔ `rtk git show HEAD`、`git grep foo` ➔ `rtk grep foo`、`wc -l a.ts` / `nl a.ts` / `strings a.ts` / `tac a.ts` / `od a.ts` / `xxd a.ts` / `base64 a.ts` ➔ `deny`。
  - `view-filter.test.ts`: `extractReadTargetsFromCommand("git show HEAD:src/a.ts")` ➔ `["src/a.ts"]`、`extractReadTargetsFromCommand("rtk git show main:src/b.ts")` ➔ `["src/b.ts"]`。
- **Tasks**:
  - [x] 1. Phase 1 TDD実装: guard群（task-size-guard, token-filter, view-filter）のテスト更新と実装 ➔ `bun test ./.agents/hooks` PASS
- **Worker Handoff Log**: `findOverstuffedPhase` (<=6 files/phase) と `isDoneTask` 追記遮断を実装し、`token-filter` / `view-filter` の抜け道を封鎖。

---

### Phase 2: タスク生成・検証スクリプトと `writing-plans` / `brainstorming` スキルの刷新
- **Worker Model**: `flash`
- **対象ファイル**: `scripts/task/new-task.ts`, `scripts/task/validate-task.ts`, `scripts/task/__tests__/new-task.test.ts`, `scripts/task/__tests__/validate-task.test.ts`, `.agents/skills/writing-plans/SKILL.md`, `.agents/skills/brainstorming/SKILL.md`
- **契約 (Interface)**:
  ```ts
  // new-task.ts: `## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)` をテンプレートに追加。
  //   Phase テンプレートに具体的な計算式/分岐条件（Exact Contract）と具体テスト値（Concrete Test Values）の案内を明記。
  // validate-task.ts: 250行制限があれば撤廃。1 Phase 内の対象ファイル数上限（最大6ファイル）等を検証しつつ、既存タスク群の互換性を維持。
  // writing-plans/SKILL.md: 22行目の `~/.gemini/config/rules/plan-artifact.md` を `.agents/rules/plan-artifact.md` に修正。
  //   250行制限を撤廃し「1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）分割」「## 2.5 Architectural Invariants & Why」「Exact Contract / Concrete Test Values 必須化」を明記。
  // brainstorming/SKILL.md: 同上の分割基準・Invariants・自己完結プロンプト要件を整合。
  ```
- **Testing Strategy**:
  - `bun test ./.agents` および `bun run task:validate tasks/TASK-159-agent-layer-v2-overhaul.md` を実行し exit code 0 を検証。
- **Tasks**:
  - [x] 1. Phase 2 実装: `new-task.ts`, `validate-task.ts`, `writing-plans/SKILL.md`, `brainstorming/SKILL.md` の改修と検証 PASS
- **Worker Handoff Log**: `## 2.5 Architectural Invariants & Why` テンプレート追加、V2タスク検証追加、スキル2件の250行制限撤廃・誤パス修正完了。

---

### Phase 3: エージェント定義（Planner / Brainstormer / Reviewer / Worker）の進化
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/agents/planner.md`, `.agents/agents/brainstormer.md`, `.agents/agents/reviewer.md`, `.agents/agents/worker.md`
- **契約 (Interface)**:
  ```markdown
  - brainstormer.md: frontmatter `model: pro` に昇格。最上位に「迎合禁止（Anti-Sycophancy）：ユーザーの要望や既存仕様に破綻・対症療法・他画面への悪影響がある場合、迎合せず『⚠️ 設計破綻・副作用の指摘』として反論・代替案を提示する義務」を明記。ハンドオフ出力を「対象パス・不変条件・仕様をすべて内包したコピペ即実行可能な自己完結型プロンプト」に改修。
  - planner.md: 最上位に「迎合禁止（Anti-Sycophancy）」を明記。「壁打ち〜 tasks/TASK-XXX.md 生成までを同一セッションで一貫実行して引き継ぎ劣化をゼロにするフロー」と「250行制限撤廃・1 Phase最大4ファイル（テスト含め6ファイル）厳守・15ファイル超は連番タスク分割」を反映。
  - reviewer.md: 4大定性監査を再編し、「ドメイン論理・数式/座標/状態遷移の整合性監査」「Invariants破壊（ちゃぶ台返し）監査」「Consumer（別画面・呼び出し元）の更新漏れ監査」を CRITICAL 審査項目として追加。
  - worker.md: タスクファイルの `## 2.5 Architectural Invariants & Why` を実装前に必ず確認し、前提条件を破壊しないよう義務付け。
  ```
- **Testing Strategy**:
  - `bun test ./.agents` を実行し、エージェント定義の整合性テストが全件 PASS することを検証。
- **Tasks**:
  - [x] 1. Phase 3 実装: `planner.md`, `brainstormer.md`, `reviewer.md`, `worker.md` の改修と `bun test ./.agents` PASS
- **Worker Handoff Log**: 4エージェント定義に迎合禁止・自己完結プロンプト・ドメイン論理/Invariants/Consumer監査・Invariants事前確認を反映完了。

---

### Phase 4: ルールファイルの重複圧縮と旧コマンド・不整合の解消
- **Worker Model**: `flash`
- **対象ファイル**: `AGENTS.md`, `.agents/rules/agent-communication.md`, `.agents/rules/agent-delegation.md`, `.agents/rules/efficient-exploration.md`
- **契約 (Interface)**:
  ```markdown
  - agent-communication.md: 残存している旧コマンド `bun run agent:check-worker` を `bun run ai:check <ファイル>` に修正。
  - agent-delegation.md / efficient-exploration.md / AGENTS.md: 250行制限の記述を撤廃（1 Phase最大4ファイル・テスト含め6ファイルに更新）し、複数ファイルに重複コピペされている冗長な説明を圧縮・正規化する。
  ```
- **Testing Strategy**:
  - `rtk grep "agent:check-worker" .agents/` が 0 件であること、および `bun test ./.agents` が全件 PASS することを検証。
- **Tasks**:
  - [x] 1. Phase 4 実装: `AGENTS.md`, `agent-communication.md`, `agent-delegation.md`, `efficient-exploration.md` の改修と検証 PASS
- **Worker Handoff Log**: 旧コマンド `agent:check-worker` 根絶、250行制限撤廃、重複記述の圧縮・正規化を完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-05 19:12
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 全4 Phaseの仕様・不変条件・テストが完全に整合し、`bun test ./.agents` (194 pass) および `bun run task:validate` が全件 PASS していることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
