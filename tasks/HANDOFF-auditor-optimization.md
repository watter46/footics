# プロジェクト完了報告書: Auditor 最適化・自律稼働化プロジェクト

## 1. プロジェクト概要・目的
- **目的**: Footics プロジェクトにおけるセッション監査エージェント「Auditor」を最適化・自律稼働化し、スクリプト実行による客観的定量化と、冷徹・敵対的な論理推論（原因層の特定・改善案提示）を自律的に完遂できる体制を確立する。
- **課題の起点**: セッション `c2ed8fa3-3d8b-44c6-bc2c-59b80300d362`（TASK-031）の監査において判明したボトルネック：
  1. `subagent-guard.ts` の誤爆により子エージェントから親への通信が遮断（Step 105）
  2. カスタムサブエージェント（Markdown 定義）に `run_command` が付与されない Antigravity CLI の仕様制約
  3. 初代 Auditor が `ai:audit` スクリプトではなく手集計を行っていたため数値が不正確

---

## 2. 確定・完了したアーキテクチャ

### ① メインセッション直接稼働方式（サブエージェント起動不要）
- 新規チャットでユーザーが `@auditor <conversation-id> を監査して` 等と指示すると、`agent-access-guard.ts` が自動で `role = 'auditor'` と判定。
- チャットセッション自身が直接 Auditor として稼働し、サブエージェントは一切起動しない。
- `auditor-guard.ts` により、Auditor ロールからの `invoke_subagent` / `define_subagent` は物理遮断（deny）。
- ファイル編集は全拒否、生ログ（`transcript*.jsonl`）の直接読込は遮断、実行可能コマンドは監査ツール（`bun run ai:audit`, `rtk`, `git` 読取専用等）に安全に限定。

### ② スクリプト層と推論層の厳格分離
- **スクリプト層 (`bun run ai:audit <id> --tree`)**:
  - 親＋子セッションツリーの再帰収集。
  - ターン数、所要時間、トークン数、Hook Denials、Redo/Loops の機械的集計。
  - 23 検出器（INFRA-01〜03, EXP-01〜10, READ-01〜10）による HIGH / MED / LOW / INFO 判定。
- **ピンポイント証拠精査 (`bun run ai:audit --step-detail <id> <step>`)**:
  - 疑わしい Step の ToolCall, Arguments, Status, Output/Error を最大 2000 文字でピンポイント抽出（生ログ直接読込ゼロ）。
- **推論層 (Auditor)**:
  - 好意解釈を排した冷徹・敵対的評価。
  - 定量値の手集計は禁止（スクリプト結果の転記のみ）。【スクリプト実測】と【推論】の明示的ラベル義務付け。
  - 8 大原因層（Planner / Worker / Scout / Reviewer / Hook / Rule / Agent定義 / Script）の論理特定とファイルパス付き改善策の提示。

---

## 3. 実装タスク一覧と完了ステータス

| タスク | 名称 | ステータス | 主要成果物・コミット |
| :--- | :--- | :--- | :--- |
| **TASK-032** | Auditor 起動基盤修復 | **DONE** | [`62b14a1`](file:///home/watter46/src/footics/.agents/scripts/commit.ts), [`79d955f`](file:///home/watter46/src/footics/.agents/scripts/commit.ts) (`agent-access-guard.ts`, `auditor-guard.ts`, `subagent-guard.ts`) |
| **TASK-033** | audit-session 基盤拡張 | **DONE** | [`5d7407d`](file:///home/watter46/src/footics/.agents/scripts/commit.ts) (`types.ts`, `tree.ts`, `render.ts`, `infra.ts`, `step-detail.ts`) |
| **TASK-034** | 探索妥当性検出器 (EXP-01〜10) | **DONE** | [`d5293fd`](file:///home/watter46/src/footics/.agents/scripts/commit.ts) (`detectors/exploration.ts`, `registry.ts`) |
| **TASK-035** | 読込最適性検出器 (READ-01〜10) | **DONE** | [`df4f2cd`](file:///home/watter46/src/footics/.agents/scripts/commit.ts) (`detectors/reading.ts`, `registry.ts`) |
| **TASK-036** | Auditor ペルソナ改修・実戦統合 | **DONE** | `.agents/agents/auditor.md`, `.agents/skills/session-audit/SKILL.md` |

---

## 4. Auditor の利用方法（ユーザー向け運用マニュアル）

新規チャットでセッションを監査する場合、以下のいずれかの形式でメッセージを送信します：

```text
@auditor c2ed8fa3-3d8b-44c6-bc2c-59b80300d362 を監査して
```
または
```text
bun run ai:audit c2ed8fa3-3d8b-44c6-bc2c-59b80300d362 でセッションを監査して
```

**Auditor の自律動作フロー**:
1. セッション自身が直接 `role = 'auditor'` として立ち上がる（サブエージェントは起動しない）。
2. Auditor は `bun run ai:audit <id> --tree` を実行して、ツリー構造と 23 検出器の Findings を取得する。
3. 問題のある Step 番号に対し `bun run ai:audit --step-detail <id> <step>` を実行して証拠を精査する。
4. 【スクリプト実測】と【推論】を分離し、8 大原因層を特定した敵対的監査レポートをユーザーに出力する。
