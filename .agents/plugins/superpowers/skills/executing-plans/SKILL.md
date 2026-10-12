---
name: executing-plans
description: Use when executing an implementation plan (tasks/TASK-*.md) as the Worker agent or inline implementer
---

# Executing Plans (実装計画実行スキル)

## 概要 (Overview)

Planner が作成した `tasks/TASK-*.md` を読み込み、そこに記載されたタスク（チェックボックス）を順次実行・実装していくためのスキルです。
Footicsの「推論の排除とスクリプト化」「極限のトークン最適化」に基づき、Worker は要件の勝手な変更を行わず、タスクの指示に従って高品質・確実に実装を完遂します。

**開始時の宣言:** `🛠️ 実装計画の実行（Worker）を開始します。`

## 実行プロセス (The Process)

1. **タスクの読込**: `view_file` ツールを用いて、指定された `tasks/TASK-*.md` を読み込みます。
2. **タスクの実行**: `4. Implementation Steps` の内容を上から順に実行します。
3. **TDDの厳守**: `test-driven-development` の原則に従い、必ずテストを書いて失敗（RED）を確認してから実装（GREEN）へ進みます。
4. **進捗の記録**: ステップが完了するごとに、`replace_file_content` ツールを用いて `tasks/TASK-*.md` の `- [ ]` を `- [x]` に更新します。
5. **自己検証**: すべてのチェックボックスが `- [x]` になったら、`pnpm run agent:check-worker <対象ファイル>` を実行して exit code 0 を確認します。

## 行動制約 (Rules & Constraints)

- **要件の改変禁止**: `2. Requirements` の内容を勝手に変更・削除してはなりません。
- **標準探索コマンドの禁止**: ファイルの閲覧・検索には `view_file`, `rtk` などの許可されたツールのみを使用してください。生の `ls` や `cat` はフックにより自動書き換えされます。
- **スコープ外の全体テスト禁止**: `pnpm test` などの無制限な全体実行は禁止です。必ず `pnpm test <対象テストファイル>` や `pnpm run agent:check-worker <対象ファイル>` など、変更ファイルに絞って実行してください。
- **未読ファイルの編集禁止 (GateGuard)**: 編集対象ファイルは事前に `view_file` で確認してから `replace_file_content` を実行してください。

## Worker 最終出力フォーマット

すべてのタスクとテストが完了したら、チャットへの最終出力を以下の**定型フォーマット**で出力し、ターンを終了してください：

```markdown
🛠️ **[WORKER COMPLETE]**
要求された全タスクの実装とテストが完了しました。Reviewerの監査を要求します。
- **Task**: [TASK-<feature-name>.md](file:///path/to/tasks/TASK-<feature-name>.md)
- **Check**: `pnpm run agent:check-worker <対象ファイル>` ➔ PASS
```
