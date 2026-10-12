---
name: requesting-code-review
description: Use when completing tasks, implementing major features, or before merging to verify work meets requirements
---

# Requesting Code Review (コードレビュー要求スキル)

## 概要 (Overview)

タスク実装完了時、主要機能追加時、またはマージ前に、コードレビューを依頼するためのスキルです。
レビュアーには作業ログの全文ではなく、対象タスクファイルへのポインタと変更差分（diff）を渡し、客観的・批判的な審査を求めます。

## レビュー要求のタイミング

- **必須**:
  - `tasks/TASK-*.md` の実装ステップが完了した直後
  - 主要な機能・リファクタリングの実装完了時
- **推奨**:
  - 実装方針に迷ったときのセカンドオピニオン
  - 複雑なバグ修正の妥当性確認

## 依頼手順 (Review Request Protocol)

1. **差分とコミットの確定**:
   - `rtk git status` および `GIT_EXTERNAL_DIFF=difft rtk git diff` で変更差分を確認。
2. **タスクファイルの更新**:
   - `tasks/TASK-*.md` の Metadata Status を `IN_REVIEW` に更新。
   - `5. Worker Verification` のチェックボックスがすべて満たされていることを確認。
3. **レビュー依頼の送信**:
   - Footics の通信規約（`agent-communication.md`）に従い、以下のフォーマットでレビューを依頼する：

```markdown
---
type: "REVIEW_REQUEST"
target_file: "tasks/TASK-XXX.md"
---
タスク `tasks/TASK-XXX.md` のレビューをお願いします。
- **検証結果**: `pnpm run agent:check-worker <対象ファイル>` ➔ PASS
```
