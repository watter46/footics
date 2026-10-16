---
name: agent-self-evaluation
description: >-
  Workerがタスクの完了を宣言しReviewerに引き渡す前に、自律的に5つの評価軸（Accuracy, Completeness, Clarity, Actionability, Conciseness）で自己採点し、品質を担保するための必須プロトコル。
---

# Agent Self-Evaluation Protocol

このスキルは、**Worker エージェントが実装タスク（TASK-*.md）を完了し、Reviewer に引き渡す直前に必ず実行しなければならない自己評価プロトコル**です。

## 実行の前提条件

このスキルを実行する前に、必ず以下のチェックコマンドが PASS していることを確認してください。
```bash
bun run agent:check-worker <変更したファイルパスのスペース区切り>
```

## 5軸評価基準 (The 5-Axis Rubric)

自身の作業結果を、以下の5つの軸において 1〜5点 で自己評価してください。

1. **Accuracy (正確性)**:
   - 実装は要件を正確に満たしているか？
   - 型エラー、Lintエラー、テストの失敗は残っていないか？
2. **Completeness (網羅性)**:
   - タスクファイルに記載されたエッジケースや異常系のハンドリングは網羅されているか？
   - 未解決のTODOや、不完全な実装（「後で実装する」等）が残っていないか？
3. **Clarity (明瞭性)**:
   - コードの意図は明確か？
   - 複雑なロジックには適切なコメントやDocstringが付与されているか？
4. **Actionability (即応性/引き継ぎ易さ)**:
   - Reviewer が直ちに確認・検証できるよう、必要な情報（どのテストを実行すべきか、どのファイルを中心にレビューすべきか）が整理されているか？
5. **Conciseness (簡潔性)**:
   - 不要なコード、冗長なログ出力、無関係な変更が含まれていないか？

## 自己採点プロセス

1. 各軸について 1〜5点 でスコアリングしてください。
2. **3点以下**の項目がある場合:
   - Reviewer を呼んではいけません。
   - 自律的に該当部分の修正作業（手戻り）に戻り、問題を解決した上で再度自己評価を行ってください。
3. **すべての項目が4点以上**の場合:
   - 以下の形式で「Self-Evaluation Scorecard」をMarkdownアーティファクト（またはチャットの最終メッセージ）として出力し、Reviewer を呼び出してください。

### スコアカード出力フォーマット例

```markdown
## Self-Evaluation Scorecard

- **Accuracy**: 5/5
  - 証拠: `agent:check-worker` の型チェックとテストが全てPASS。
- **Completeness**: 4/5
  - 証拠: タスク要件1〜3を全て実装。エラーハンドリングも仕様通り。
- **Clarity**: 4/5
  - 証拠: `calculateFormation` のロジックにJSDocコメントを付与。
- **Actionability**: 5/5
  - 証拠: レビュー用の重点ファイル（src/lib/data/matches.ts）と確認方法を明記。
- **Conciseness**: 5/5
  - 証拠: Biome による自動フォーマット済み。不要な console.log を削除。

**結論**: 自己評価基準をクリア。Reviewer への引き渡しを申請します。
```
