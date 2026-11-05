---
name: agent-delegation
description: "サブエージェント委任時の完了回収・成果物契約およびゾンビタスク防止規約"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---

# サブエージェント委任・オーケストレーション規約 (Subagent Delegation Protocol)

本ルールは、Planner や Worker がサブエージェント（research, reviewer, worker 等）を呼び出す際の、孤児化（Orphan）・結果ロスト・ゾンビタスク化を防ぐための行動規約です。

---

## 1. 委任完了契約とライフサイクル管理 (Delegation Lifecycle Contract)

1. **結果回収の義務付け**:
   - サブエージェントを `invoke_subagent` ツールで起動した親エージェントは、**必ず子エージェントから完了メッセージまたは成果物を受信・確認した上で自身のタスクを完了**しなければならない。
   - 子エージェントが実行中または未応答の状態で、親エージェントが自らターンを終了（`DONE` や完了宣言）してはならない。
2. **Phase 分割基準・非重複並列 Worker 起動・即時破棄（Kill）**:
   - **単一 Worker の再利用・使い回しは厳禁**: 完了済 Worker への `send_message` はフック（`subagent-guard`）により遮断されます。各 Worker の完了受領後は直ちに `manage_subagents(Action: "kill")` で破棄してください。
   - **ファイル数ベースの Phase 分割（旧250行制限は撤廃）**:
     - **1〜4ファイル**: 1 Phase（1 Worker）で一括完遂させます。
     - **5ファイル以上**: 1 Phase 最大4プロダクションファイル（テスト含め最大6ファイル）以下に分割し、非重複 Phase は同一ターン内で複数の `invoke_subagent(TypeName: "worker")` を並列発行します（差し戻し `Fix` も同様）。
     - **15ファイル超（または 6 Phase 以上）**: 1タスクの Phase 上限（最大 5 Phase）を超えないよう、連番タスク（`TASK-XXXa`, `TASK-XXXb`）に分割します（`task-size-guard` により 6 Phase 以上・1 Phase 7ファイル以上・DONE タスクへの Phase 追記は物理遮断）。
   - **Scout 委譲（6ファイル以上の調査のみ）**: 5ファイル以下は Planner 自前並列読込、6ファイル以上のみ `Scout`（`Model: "flash_lite"`、最大6ターン）へ委譲し、結果（`Target Line Map`）受領後に即 kill します（Planner による二重調査は禁止。詳細は `efficient-exploration.md` 参照）。
   - **完了待ちのポーリング禁止**: `manage_subagents(Action: "list")` の 3 回連続呼び出しは `subagent-guard` により遮断されます。完了通知は自動到着するため、ツールを呼ばずにターンを終了して待機してください。
3. **放置プロセスの即時回収**:
   - サブエージェントをバックグラウンドに放置したままセッションや親タスクを切り上げてはならない。

---

## 2. モデル階層と動的選定基準 (Model Hierarchy & Dynamic Selection)

タスクの規模・難易度・役割に応じて `invoke_subagent` の `Model` 引数を厳格に指定し、推論品質とトークン効率を最大化します。

| 役割 | Model 指定 | 充当モデル | 責務と選定基準 |
| :--- | :--- | :--- | :--- |
| **Planner** | `Model: "pro"` (または `inherit`) | **Pro / Argon High** | ユーザー対話（`caveman`）、タスク策定、非重複並列オーケストレーション |
| **Reviewer** | `Model: "pro"` (または `inherit`) | **Pro / Argon High** | Zero-Command コード差分監査（git diff による 4大定性監査。`Model: "flash"` のハードコードは禁止） |
| **Auditor** | `Model: "pro"` (または `inherit`) | **Pro / Argon High** | セッション・エージェント行動監査、および `.agents/**`・`tasks/**` の直接改善 |
| **Worker (標準)** | `Model: "flash"` | **Flash** | Zero-Exploration TDDサイクル（テスト作成・実装）。1〜4ファイルは 1 Worker で一括完遂 |
| **Worker (定型)** | `Model: "flash_lite"` | **Flash-Lite** | 文言・メッセージ修正、定数追加、軽微なCSS/スタイル修正、単一関数の単純な修正 |
| **Scout** | `Model: "flash_lite"` | **Flash-Lite** | 6ファイル以上の広範囲先遣調査（Read-Only、最大6ターン完了）。対象パスと型シグネチャを抽出し即破棄 |

---

## 3. 成果物の明示（Final Deliverable）

1. **最終メッセージが成果物**:
   - サブエージェントは作業完了時、単に「完了しました」とだけ返すのではなく、何を作成・修正・検証したのか要約とファイルリンクを明確に親エージェントへ報告すること。
2. **証拠の添付**:
   - 検証やテストを行ったサブエージェントは、実行結果（成功ステータス、テスト件数、エラーログ等）を必ず報告に含めること。
3. **Worker Handoff Log の記録**:
   - Worker はタスクファイルの該当 Phase 内に、確定した export シンボルや注意点（Gotcha）を 1〜2 行で記録した上で報告すること。
