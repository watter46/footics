---
name: agent-self-evaluation
description: >-
  Worker が bun run ai:check <files> 通過後に Planner へ TASK_COMPLETE を報告する前に、5つの評価軸（Accuracy, Completeness, Clarity, Actionability, Conciseness）で自律点検し品質を担保するためのプロトコル。
---

# Agent Self-Evaluation Protocol

このスキルは、**Worker エージェントが担当 Phase の実装とテストを完了し、Planner へ `TASK_COMPLETE` を報告する直前に行う最終自己点検プロトコル**です。

## 実行の前提条件

自己点検の前に、必ず担当ファイル群に対して以下が PASS していること：
```bash
bun run ai:check <変更したファイルパスのスペース区切り>
```

## 5軸点検チェックリスト

1. **Accuracy (正確性)**:
   - タスクファイルの `Contract`（型・シグネチャ・振る舞い仕様・境界条件）を厳密に満たしているか？
   - 型エラー・Lint エラー・テスト失敗が残っていないか（`biome-ignore` や `as any` の逃げがないか）？
2. **Completeness (網羅性)**:
   - `Concrete Test Cases` および `[DELETE]` / `Consumers` 同期更新（フォールバック残存ゼロ）をすべて完遂したか？
   - 内部 Store / Hook の `vi.mock` を使わず、純粋関数 I/O または実 `StoreProvider` 結合テストで検証しているか？
3. **Clarity (明瞭性)**:
   - 非自明な計算・制約の意図（Why）がコードから読み取れるか？
4. **Actionability (引き継ぎ性)**:
   - Planner へ送る `TASK_COMPLETE` メッセージに、変更・削除したファイル一覧、次の直列 Phase へ渡す公開シンボル、および `ai:check` 合格結果が過不足なく書かれているか？
5. **Conciseness (簡潔性)**:
   - 不要コード・`console.log`・担当外ファイル（特に `TASK-*.md` の直接編集）への不要な変更が含まれていないか？

## 判定ルール

- 1項目でも未達があれば `TASK_COMPLETE` を送らず自律修正して `bun run ai:check <files>` を再実行する（3回連続失敗時は `TASK_BLOCKED` でエスカレーションする）。
- 全項目クリア後にのみ、`.agents/rules/agent-communication.md` の `TASK_COMPLETE` 形式で Planner へ報告する。
