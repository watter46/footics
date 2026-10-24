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
2. **1〜4ファイル一括完遂・非重複並列 Worker 起動・即時破棄（Kill）**:
   - **単一 Worker の再利用・使い回しは厳禁**です。完了済Workerへの `send_message` はフック（`subagent-guard`）により物理的に遮断（deny）されます。
   - **1〜4ファイルの変更は 1 Worker で一気に完遂**: 変更対象が 1〜4 ファイル程度のタスクは細切れの Phase リレーに分割せず、1つの Phase（1 Worker）で一気に完遂させます。
   - **非重複 Phase / Task の並列起動**: 編集対象ファイルに被りがない複数の Phase や独立タスクは、直列に待たず **同一ターン内で複数の `invoke_subagent(TypeName: "worker")` を並列発行** して短時間で実装を完了させます。
   - 各 Worker の完了メッセージを受領したら、親エージェントは直ちに `manage_subagents` ツール（`Action: "kill"`）を実行して該当 Worker を破棄しなければなりません。
   - **Scout の委譲基準（5ファイル以下自前・6ファイル以上Scout）と即時破棄**:
     - **5ファイル以下の調査**: Planner 自前の並列読込（`ai:find`, `ai:outline`, `read_file`）で完結させます。
     - **6ファイル以上の調査**: 関連ファイルが 6 件以上に及ぶ場合（`view-filter` により 6 ファイル目以降の直接読込は遮断）、`Scout`（`TypeName: "scout"`, `Model: "flash_lite"`）に `type: "SCOUT_REQUEST"` で委譲し（最大 6 ターン完了）、結果受領後に直ちに kill します。
   - 1タスクあたりの Phase 数は最大 5 Phase（行数 250 行以内）。追加要件は新チケットへ分離します（フック `task-size-guard` により強制）。
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
