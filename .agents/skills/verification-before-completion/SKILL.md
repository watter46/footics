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
  1. `code-guardrails`（`any` 禁止、内部 Store `vi.mock` 禁止、ファイルサイズ、Store シングルトン直参照禁止）
  2. `biome check --write`（自動フォーマット＆Lint検証）
  3. 担当 Phase に含まれるテストファイルの `vitest run <test-files>`
- **報告義務**: exit code 0 を確認した上で、タスクファイルのチェックボックスを埋め、Planner へ `TASK_COMPLETE` を送信する。

### 2. 全 Phase 完了後・コミット時（Planner エージェント）
- **検証コマンド**: `bun run ai:preflight` および `bun run ai:commit -m "<Commit Message>"`
- **実行内容**:
  1. `bun run task:validate`（タスクファイルの未完了項目ゼロ確認、`[DELETE]` 指定ファイルの物理削除確認）
  2. プロジェクト全体の `tsc --noEmit`（Phase 間の型整合性の完全保証）
  3. 変更に関連する全テストの `vitest run related`
  4. `depcruise`（循環 import および Web/Extension ホスト境界違反の遮断）
  5. `GIT_EXTERNAL_DIFF=difft rtk git diff` による最終差分確認と自動ステージング・コミット
