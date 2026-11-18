---
description: "PlannerとWorker間の通信プロトコル、ステータス出力、およびエラー時エスカレーションルール（2階層パイプライン）"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---
# エージェント通信・状態管理規約 (Agent Communication Protocol)

本ドキュメントは、2階層（Planner + Worker）で協調して動作するための通信プロトコルを定義します（旧 `Scout` / `Reviewer` は廃止済み）。

## 1. 通信方式 (YAML Frontmatter + Markdown)

エージェント間のメッセージング（`invoke_subagent` / `send_message`）は、**YAML Frontmatter + Markdown** 形式を採用します。
`invoke_subagent` には長文コードを貼り付けず、対象タスクファイルと Phase 番号へのポインタのみを含めます。

### 1.1 Planner → Worker (Phase 委譲)
```markdown
---
type: "TASK_ASSIGN"
target_file: "tasks/TASK-XXX.md"
target_phase: 1
---
タスク `tasks/TASK-XXX.md` の Phase 1 の実装を開始してください。
（直列 Wave での引き継ぎ事項や Fix 指示がある場合は1〜2行のみ追記）
```

### 1.2 Worker → Planner (Phase 完了 / ブロック報告)
Worker は並列競合を防ぐため `tasks/TASK-*.md` を直接編集せず、結果と要点をメッセージで返します。
```markdown
---
type: "TASK_COMPLETE"
target_file: "tasks/TASK-XXX.md"
phase: 1
---
Phase 1 の実装および `bun run ai:check` が PASS しました。
```
`ai:check` が3回連続で失敗した場合は `type: "TASK_BLOCKED"` を送信し、詰まった原因と対象箇所を2〜3行で報告します。

### 1.3 Planner → Worker (追加修正 Fix 委譲: `FIX_ASSIGN`)
`/compact` 後や実装完了後の追加修正では、タスクファイルを書き換えずに修正対象ファイルと修正内容を直接渡します。
```markdown
---
type: "FIX_ASSIGN"
target_files:
  - "src/path/to/file.ts"
  - "src/path/to/file.test.ts"
---
修正内容: {再現条件・期待する変更・テスト方針}
```
Worker は `target_files` のみを読んで修正し、`bun run ai:check <target_files>` 通過後に変更したファイル一覧を添えて `type: "TASK_COMPLETE"` を返します。

## 2. 終了・再試行のルール（使い捨てワーカー原則）

1. **完了/ブロック Worker の即時破棄**: Planner は `TASK_COMPLETE` または `TASK_BLOCKED` を受信したら、次ステップで必ず `manage_subagents(Action: "kill", ConversationIds: [...])` を実行して Worker を破棄する。同一 Worker の再利用は禁止。
2. **修正が必要な場合**: タスクファイル末尾への追記（旧 `Rejections` 欄）は廃止。修正内容（エラー要約・対象ファイル）を指示文に含めた **新規 Fix Worker** を1回起動して解決する。
3. **上限**: 再試行が改善しない場合、Planner はユーザーに制御を返す。

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
