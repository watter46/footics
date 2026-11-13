---
description: "PlannerとWorker間の通信プロトコル、ステータスバッジ出力、および差し戻しルール（2階層パイプライン）"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---
# エージェント通信・状態管理規約 (Agent Communication Protocol)

本ドキュメントは、2階層（Planner + Worker）で協調して動作するための通信プロトコルと、状態管理の Single Source of Truth となるタスクファイルの運用ルールを定義します（旧 `Scout` / `Reviewer` は廃止済み）。

## 1. 通信方式 (YAML Frontmatter + Markdown)

エージェント間のメッセージング（`invoke_subagent` / `send_message`）は、**YAML Frontmatter + Markdown** 形式を採用します。
メッセージには「タスクの具体的な中身」や長文コードを貼り付けず、最小限の信号（シグナル）と対象ファイル・Phaseへのポインタのみを含めます。タスクの詳細は常に `tasks/TASK-*.md` を参照してください。

### 1.1 Planner → Worker (タスク開始 / Phase委譲)
```markdown
---
type: "TASK_ASSIGN"
target_file: "tasks/TASK-XXX.md"
target_phase: 1
---
タスク `tasks/TASK-XXX.md` の Phase 1 の実装を開始してください。
（再作成・追加指示時は該当 Fix セクション名のみ記載）
```

### 1.2 Worker → Planner (Phase 実装完了報告)
```markdown
---
type: "TASK_COMPLETE"
target_file: "tasks/TASK-XXX.md"
phase: 1
---
Phase 1 の実装および `bun run ai:check <ファイル>` のローカル検証が完了しました。
```

## 2. 差し戻し・終了のルール（使い捨てワーカー原則）

1. **完了済 Worker の即時破棄**: Planner は `TASK_COMPLETE` を受信したら、次ステップで必ず `manage_subagents(Action: "kill", ConversationIds: [...])` を実行して Worker を破棄する。同一 Worker の別 Phase 再利用は禁止。
2. **修正が必要な場合**: 問題が見つかった場合はタスクファイル末尾 `## 6. Rejections / Additional Tasks` に `### Fix 1 (YYYY-MM-DD)` を追記して `task:validate` を通し、**新規 Worker** を起動して再実装させる。
3. **上限**: 同一 Phase の再試行が改善しない場合、Planner はユーザーに制御を返す。

## 3. ユーザー対話スタイル (`caveman`) と実装完了サマリーテンプレート

ユーザーとの対話では **`caveman`（結論最優先・前置きや儀礼的挨拶の排除）** を常時適用し、冗長な出力を避けてください。

### 3.1 実装完了時のユーザー報告テンプレート（2項目のみ厳守）
実装・コミット完了時の最終報告は、内部のファイル名や技術詳細を羅列せず、**必ず以下の「① 変更された内容」「② 手動・目視での確認手順」の2項目のみ** で出力してください。

```markdown
✅ **[実装完了] TASK-XXX: {タスク名}** (commit: `{hash}`)

### 1. 変更された内容（何が変わったか）
- {ファイル名や内部コードを出さず、ユーザー目線で変わった画面の挙動・機能を1行ずつ端的に記述}

### 2. 手動・目視での確認手順
1. **{確認対象の画面}** を開く
2. **{行う操作}**
3. **{期待される結果}** になっていればOK
（※目視確認が不要な内部改修のみの場合は「自動テストで検証済みのため目視確認は不要です」と1行記載）
```

### 3.2 Planner (プラン作成・承認待ち時)
```markdown
📝 **[PLANNING COMPLETE]**
タスクファイルを生成しました。内容を確認し、承認してください。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)
```
