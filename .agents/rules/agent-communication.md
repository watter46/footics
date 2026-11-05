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

### 1.1 Planner → Worker (タスク開始 / Phase委譲)
```markdown
---
type: "TASK_ASSIGN"
target_file: "tasks/TASK-XXX.md"
target_phase: 1
---
タスク `tasks/TASK-XXX.md` の Phase 1 の実装を開始してください。
（差し戻しの場合は「Fix 1 の指示に従って修正してください」等と記載）
```

### 1.2 Worker → Planner (Phase 実装完了報告)
```markdown
---
type: "TASK_COMPLETE"
target_file: "tasks/TASK-XXX.md"
phase: 1
---
Phase 1 の実装および `bun run ai:check <ファイル>` のローカル検証が完了しました。Handoff Log を追記済みです。
```

### 1.3 Planner → Reviewer (全Phase完了後のレビュー依頼)
```markdown
---
type: "REVIEW_REQUEST"
target_file: "tasks/TASK-XXX.md"
---
全 Phase の実装が完了しました。タスク `tasks/TASK-XXX.md` の総合レビューをお願いします。
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

### 1.5 Planner → Scout (6ファイル以上の広範囲調査依頼)
```markdown
---
type: "SCOUT_REQUEST"
---
以下の調査対象について、6ターン以内で対象ファイルパスと型シグネチャを抽出してください：
- [調査項目]
```

## 2. Reviewer による差し戻し（REJECTED）のルール

1. **不可逆修正欄への追記**: Reviewer は既存のタスクや Phase を消去・上書きせず、必ず `tasks/TASK-*.md` の末尾 `## 6. Rejections / Additional Tasks` に `### Fix 1 (YYYY-MM-DD)` の形式で追記する。
2. **自己完結な指示**: Worker がチャット履歴を遡らなくて済むよう、追加修正欄には対象ファイルパスと具体的な修正ステップ（`bun run ai:check <ファイル>` での検証指示含む）を明記する。
3. **ステータス更新**: タスクファイル内の Metadata の Status を `REJECTED` に変更する。
4. **上限**: 差し戻しは原則1回までとする。解決しない場合は Planner はユーザーに制御を返すこと。

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
