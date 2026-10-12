---
name: receiving-code-review
description: Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation
---

# Receiving Code Review (コードレビュー受領・対応スキル)

## 概要 (Overview)

コードレビューのフィードバックを受領した際、無批判な盲従や感情的な相槌を排し、技術的な厳密性とエビデンスに基づいて対応するためのスキルです。

## 鉄則 (Core Principles)

1. **実装前に検証する**: レビュアーの指摘が正しいか、実際のコードと仕様を確認する。
2. **推測前に確認する**: 指摘内容が曖昧な場合は勝手に解釈せず、明確化の質問を行う。
3. **社交辞令の禁止**: 「おっしゃる通りです！」「素晴らしい指摘ですね！」などの空虚な前置きは禁止。

## レビュー受領時の対応フロー

```
1. 精読: 指摘事項を最後まで読み、評価する。
2. 理解: 何が問題とされているのか技術的要件を把握する。
3. 検証: 現行コードやテストで指摘内容を再現・確認する。
4. 判定:
   - 正当な指摘: tasks/TASK-*.md の差し戻しタスクに従い、1つずつ TDD で修正。
   - 誤った指摘: 技術的根拠（仕様、型、テスト結果）を明示して論理的に反論。
5. 報告: 修正した内容と再検証結果（agent:check-worker PASS）を報告。
```

## 差し戻し（REJECTED）発生時のルール

1. `tasks/TASK-*.md` の末尾 `7. Rejections / Additional Tasks` に追記された追加手順を確認する。
2. チャット履歴を遡る必要がないよう、タスクファイル記載のファイルパスと指示に集中する。
3. 修正後、テストを通過させてから再度 `REVIEW_REQUEST` を送信する。
