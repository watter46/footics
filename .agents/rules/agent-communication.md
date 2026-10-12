---
description: "Planner, Worker, Reviewer間の通信プロトコル、ステータスバッジ出力、および差し戻しルール"
globs:
  - "tasks/**"
  - ".agents/agents/**"
---
# エージェント通信・状態管理規約 (Agent Communication Protocol)

本ドキュメントは、Planner, Worker, Reviewer エージェントが協調して動作するための通信プロトコルと、状態管理の Single Source of Truth となるタスクファイルの運用ルールを定義します。

## 1. 通信方式 (YAML Frontmatter + Markdown)

エージェント間のメッセージング（`send_message` / `invoke_subagent`）は、**YAML Frontmatter + Markdown** 形式を採用します。
メッセージには「タスクの具体的な中身」は記述せず、最小限の信号（シグナル）と対象ファイルへのポインタのみを含めます。タスクの詳細は常に `tasks/TASK-*.md` を参照してください。

### 1.1 Planner → Worker (タスク開始 / 差し戻し再開)
```markdown
---
type: "TASK_ASSIGN"
target_file: "tasks/TASK-XXX.md"
---
タスク `tasks/TASK-XXX.md` の実装を開始してください。
（差し戻しの場合は「追加タスクセクションを確認して修正してください」等と記載）
```

### 1.2 Worker → Planner (実装完了報告)
```markdown
---
type: "TASK_COMPLETE"
target_file: "tasks/TASK-XXX.md"
---
実装および `agent:check-worker` のローカル検証が完了しました。
```

### 1.3 Planner → Reviewer (レビュー依頼)
```markdown
---
type: "REVIEW_REQUEST"
target_file: "tasks/TASK-XXX.md"
---
タスク `tasks/TASK-XXX.md` のレビューをお願いします。
```

### 1.4 Reviewer → Planner (レビュー結果報告)
```markdown
---
type: "REVIEW_RESULT"
status: "LGTM" | "REJECTED"
target_file: "tasks/TASK-XXX.md"
---
（判定結果の概要を記載）
```

## 2. Reviewer による差し戻し（REJECTED）のルール

1. **タスクファイルの追記**: Reviewer は必ず `tasks/TASK-*.md` の末尾（`Rejections / Additional Tasks`）に差し戻し理由と追加タスク（チェックボックス形式）を追記する。
2. **自己完結な指示**: Worker がチャット履歴を遡らなくて済むよう、追加タスクにはファイルパスと修正内容を具体的に記載する。
3. **ステータス更新**: タスクファイル内の Metadata の Status を `REJECTED` に変更する。
4. **上限**: 差し戻しは原則1回までとする。解決しない場合は Planner はユーザーに制御を返すこと。

## 3. ユーザー向け進捗報告テンプレート (Status Badges)

ユーザーへのチャット進捗報告は以下の定型バッジフォーマットを使用し、冗長な出力を避けてください。

### 3.1 Planner (プラン作成・承認待ち時)
```markdown
📝 **[PLANNING COMPLETE]**
タスクファイルを生成しました。内容を確認し、承認してください。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)
- **Target**: `src/...`
```

### 3.2 Worker (実装完了・レビュー依頼時)
```markdown
🛠️ **[WORKER COMPLETE]**
要求された全タスクの実装とテストが完了しました。Reviewerの監査を要求します。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)
- **Check**: `pnpm run agent:check-worker` ➔ PASS
```

### 3.3 Reviewer (監査結果報告時)
```markdown
✅ **[REVIEW: LGTM]**
要件および品質チェックを満たしています。マージ可能です。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)

*(差し戻しの場合)*
🛑 **[REVIEW: REJECTED]**
タスクファイルにフィードバックを追記しました。Workerは再実行してください。
- **Task**: [TASK-XXX.md](file:///path/to/tasks/TASK-XXX.md)
- **Reason**: [簡潔な理由]
```
