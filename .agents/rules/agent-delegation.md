---
name: agent-delegation
description: "2階層エージェント（Planner + Worker）のモデル使い分け・Phase分割上限・並列起動・即時破棄プロトコル"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---

# サブエージェント委任・オーケストレーション規約 (2-Tier Delegation Protocol)

本プロジェクトは **Planner（計画・オーケストレーション）と Worker（Phase 実装）の2階層のみ** で構成する。
旧 `Scout` および旧 `Reviewer` サブエージェントは廃止されており、`invoke_subagent` での起動はフック（`subagent-guard`）により物理遮断される。

---

## 1. 委任ライフサイクル管理 (Delegation Lifecycle Contract)

1. **完了済 Worker の再利用禁止と即時破棄（Kill）**:
   - 完了済 Worker への `send_message` はフック（`subagent-guard`）により強制遮断される。
   - Worker から `TASK_COMPLETE` または `TASK_BLOCKED` を受信したら、直ちに `manage_subagents(Action: "kill", ConversationIds: [worker_id])` で破棄すること。
2. **サイズ上限・Phase 分割基準と `Execution Waves`**:
   - **1 Phase の実作業ファイル数**: 推奨 `2〜3`、**ハード上限 `4 ファイル`**（`[ADD]` / `[MODIFY]` 合算、`[DELETE]` はカウント除外）。
   - **大ファイル・移行特例**: 既存 `300行超` ファイルや大型テスト移行を含む場合は、**`1 Phase = 1 プロダクションファイル（＋対応テスト1まで）`**・読込合計目安 `600行以内` に限定する。
   - **1タスク上限**: 最大 **`5 Phase`** / タスクファイル全体 **`400行以内`** / 単一コードブロック **`40行以内`**（超過規模は連番タスク `TASK-XXXa`, `TASK-XXXb` に分割）。
   - **Wave 並列実行**: タスクファイルの `Execution Waves` に従い、同一 Wave 内の非重複 Phase は同一ターン内で複数の `invoke_subagent(TypeName: "worker")` を並列発行する。
   - **Worker の `TASK-*.md` 直接編集禁止**: 並列編集競合を防ぐため、Worker はタスクファイルを編集せず `send_message` で結果を報告し、`Status: DONE` 更新は Planner が行う。
   - **完了待ちのポーリング禁止**: `manage_subagents(Action: "list")` の3回連続呼び出しは遮断される。完了通知は自動到着するため、ツールを呼ばずにターンを終了して待機する。

---

## 2. コンテキスト・モデル階層と責務分担

| 役割 | 想定モデル | 責務 |
| :--- | :--- | :--- |
| **Planner (コンテキスト A: 設計・タスク作成)** | 高推論モデル（`mid` / `high`） | 直接探索（`ai:impact` / `ai:peek` / `rg -l` / `read_file`）、Plan Artifact 作成、部品契約型タスクファイル（`Execution Waves` / 機械検証 `Negative Contracts` / 公開型・振る舞い仕様 / 具体テストケース）作成、`bun run task:validate` 検証 |
| **Planner (コンテキスト B: 実行オーケストレーター)** | `Gemini 4 Hydrogen/low` (`inherit`) | `Execution Waves` に沿った Worker 起動・回収・破棄、`Status: DONE` 更新、および全 Phase 完了後の `bun run ai:commit` 実行（`task:validate --verify-contracts --require-done` + `ai:preflight` + 自動コミット） |
| **Worker (Phase 実装担当)** | `Gemini 4 Hydrogen/low` (`inherit`) | 担当 Phase の `Target Files` / `Reference Files` を読み込み、`Contract` 通りに実装＋削除＋共通規約準拠テスト（内部 `vi.mock` 禁止）を作成、`bun run ai:check <担当ファイル>`（Guardrails + Biome + Scoped tsc + Phase テスト）で自己修復・完遂 |
| **Auditor / Architect** | 高推論モデル | セッション監査（`ai:audit`）および `.agents/**`・ドメインアーキテクチャ規約の保守 |
