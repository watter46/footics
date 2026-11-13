---
name: verification-before-completion
description: Phase完了時（Worker）および全Phase統合完了時（Planner）に検証コマンドを実行し、exit code 0 の証拠を確認するスキル
---

# Verification Before Completion (完了前検証スキル)

## 鉄の掟 (The Iron Law)

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
(最新の検証エビデンスなしに、完了を宣言してはならない)
```

## 2段階の検証ゲート (2-Stage Verification Gate)

### 1. 各 Phase 完了時（Worker エージェント）
- **検証コマンド**: `bun run ai:check <担当ファイル群（DELETE除く）>`
- **実行内容**:
  1. `code-guardrails`（`any` 禁止、内部モジュール `vi.mock` 禁止、ファイルサイズ、シングルトン直参照禁止）
  2. `biome check --write`（自動フォーマット＆Lint検証）
  3. `typecheck:scoped --scoped-only`（担当 `.ts/.tsx` ファイルの高速型チェック）
  4. 担当 Phase に含まれるテストファイルの `vitest run` / `bun test`
- **報告義務**: exit code 0 を確認した上で、Planner へ `TASK_COMPLETE` を送信する（`tasks/TASK-*.md` 自体は編集しない）。

### 2. 全 Phase 完了後・コミット時（Planner エージェント）
- **準備**: `GIT_EXTERNAL_DIFF=difft rtk git diff` 確認後、タスクファイルの `Status` を `DONE` に更新する。
- **検証コマンド**: `bun run ai:preflight` および `bun run ai:commit`（または `-m "<Commit Message>"`）
- **実行内容**:
  1. `bun run task:validate --verify-contracts --require-done`（`Status: DONE`・`[DELETE]` 物理削除・`Negative Contracts` `rg:`/`absent:` 0件の機械検証）
  2. プロジェクト全体の `tsc --noEmit`（Phase 間の型整合性の完全保証）
  3. 変更に関連する全テストの `vitest run related` / `bun test`
  4. `depcruise`（循環 import および Web/Extension ホスト境界違反の遮断）
  5. 自動ステージング・コミット
