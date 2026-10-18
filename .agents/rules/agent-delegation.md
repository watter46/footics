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
2. **Phase ごとの即時破棄（Kill）とリレー実行 (ゾンビ化・コンテキスト肥大化の完全防止)**:
   - **単一 Worker の再利用・使い回しは厳禁**です。完了済Workerへの `send_message` はフック（`subagent-guard`）により物理的に遮断（deny）されます。
   - 各 Phase の完了メッセージを受領したら、親エージェントは直ちに `manage_subagents` ツール（`Action: "kill"`）を実行して該当 Worker を破棄しなければなりません。
   - **Scout の即時破棄**: 調査を担当した Scout エージェントも同様に、Context Snippets を受領した直後に親エージェントが直ちに kill し、調査コンテキストをセッションに残さないようにします。
   - 次の Phase は、前 Phase の成果物と Worker Handoff Log を元に新しい Worker を新規起動して引き継ぎます。
   - 1タスクあたりの Phase 数は最大 5 Phase（行数 250 行以内）。追加要件は新チケットへ分離します（フック `task-size-guard` により強制）。
3. **放置プロセスの即時回収**:
   - サブエージェントをバックグラウンドに放置したままセッションや親タスクを切り上げてはならない。

---

## 2. モデル階層と動的選定基準 (Model Hierarchy & Dynamic Selection)

タスクの規模・難易度・役割に応じて `invoke_subagent` の `Model` 引数を厳格に指定し、推論品質とトークン効率を最大化します。

| 役割 | Model 指定 | 充当モデル | 責務と選定基準 |
| :--- | :--- | :--- | :--- |
| **Planner** | - (メイン) | **`Gemini 3.8 Flash (High)`** | ユーザー対話、タスクファイル策定（Context Injection）、HITL、Phase リレーオーケストレーション |
| **Scout** | `Model: "flash"` / `"flash_lite"` | **Gemini 3.8 Flash Low/Med 相当** | 先遣調査・文脈抽出（Read-Only）。`ai:outline` や Grep で型・シグネチャ・既存パターンを抽出し即破棄 |
| **Worker (標準)** | `Model: "flash"` | **Gemini 3.8 Flash Medium 相当** | Zero-Exploration TDDサイクル（テスト作成・実装）。タスクの Context Snippets を元に対象ファイルのみ編集 |
| **Worker (定型)** | `Model: "flash_lite"` | **Gemini 3.8 Flash Low 相当** | 文言・メッセージ修正、定数追加、軽微なCSS/スタイル修正、単一関数の単純な修正 |
| **Reviewer** | `Model: "flash"` | **Gemini 3.8 Flash Medium 相当** | Zero-Read 自動検証・差分審査（`ai:reviewer:check` の diff + 型/テスト/行数のみで客観判定） |

---

## 3. 成果物の明示（Final Deliverable）

1. **最終メッセージが成果物**:
   - サブエージェントは作業完了時、単に「完了しました」とだけ返すのではなく、何を作成・修正・検証したのか要約とファイルリンクを明確に親エージェントへ報告すること。
2. **証拠の添付**:
   - 検証やテストを行ったサブエージェントは、実行結果（成功ステータス、テスト件数、エラーログ等）を必ず報告に含めること。
3. **Worker Handoff Log の記録**:
   - Worker はタスクファイルの該当 Phase 内に、確定した export シンボルや注意点（Gotcha）を 1〜2 行で記録した上で報告すること。
