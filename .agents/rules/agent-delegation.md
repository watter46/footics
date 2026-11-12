---
name: agent-delegation
description: "2階層エージェント（Planner + Worker）の委任・並列起動・即時破棄プロトコル"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---

# サブエージェント委任・オーケストレーション規約 (2-Tier Delegation Protocol)

本プロジェクトは **Planner（計画・実行管理）と Worker（Phase 実装）の2階層のみ** で構成する。
旧 `Scout`（先遣調査）および旧 `Reviewer`（差分監査）サブエージェントは廃止されており、`invoke_subagent` での起動はフック（`subagent-guard`）により物理遮断される。

---

## 1. 委任ライフサイクル管理 (Delegation Lifecycle Contract)

1. **完了済 Worker の再利用禁止と即時破棄（Kill）**:
   - 完了済 Worker への `send_message` はフック（`subagent-guard`）により強制遮断される。
   - Worker から `TASK_COMPLETE` を受信したら、直ちに `manage_subagents(Action: "kill", ConversationIds: [worker_id])` で破棄すること。
2. **Phase 分割基準と非重複並列 Worker 起動**:
   - **1〜4ファイル**: 1 Phase（1 Worker）で一括完遂させる。
   - **5ファイル以上**: 1 Phase あたり **最大4プロダクションファイル＋2テストファイル（計6ファイル）以下** に分割する。ただし **`[DELETE]`（ファイル削除）は上限カウントから除外** する。
   - **非重複 Phase の並列実行**: 対象ファイルに重複がない複数 Phase は、同一ターン内で複数の `invoke_subagent(TypeName: "worker")` を並列発行して高速化する。
   - **完了待ちのポーリング禁止**: `manage_subagents(Action: "list")` の3回連続呼び出しは遮断される。完了通知は自動到着するため、ツールを呼ばずにターンを終了して待機する。

---

## 2. モデル階層と役割分担 (2-Tier Model Hierarchy)

| 役割 | Model 指定 | 責務 |
| :--- | :--- | :--- |
| **Planner (コンテキスト A/B: 設計・タスク作成)** | `pro` | 自前での高速探索（`ai:outline` / `rg -l` / `read_file`）、日本語 Plan Artifact 作成、局所契約（全コピペ禁止・ブロック120行以内・全体800行上限）と事前 `Commit:` を備えたタスクファイル作成、`bun run task:validate` による検証 |
| **Planner (コンテキスト C: 実行オーケストレーター)** | `pro` | 各 Phase の Worker 起動・回収・破棄、および **全 Phase 完了後の `bun run ai:preflight` / `bun run ai:commit` 実行と `git diff` 最終確認** |
| **Worker (標準)** | `flash` | タスクファイルの1 Phase 分の `[ADD]` / `[MODIFY: Before ➔ After]` / `[DELETE]` 実装＋実 Store / 純粋関数テスト作成、`bun run ai:check <担当ファイル>` による Phase 内検証 |
| **Worker (定型)** | `flash_lite` | 単純な機械的置換、削除、定数・文言修正 |
| **Auditor / Architect** | `pro` | セッション監査（`ai:audit`）および `.agents/**`・ドメインアーキテクチャ規約の保守 |
