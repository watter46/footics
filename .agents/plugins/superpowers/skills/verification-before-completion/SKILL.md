---
name: verification-before-completion
description: Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always
---

# Verification Before Completion (完了前検証スキル)

## 概要 (Overview)

作業の完了宣言、コミット、PR作成を行う前に、必ず検証コマンドを最新の状態で実行し、出力結果（エビデンス）を確認した上で主張を行うための規約です。

## 鉄の掟 (The Iron Law)

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
(最新の検証エビデンスなしに、完了を宣言してはならない)
```

直前に検証コマンドを実行していない場合、「パスしました」「完了しました」と主張してはなりません。「おそらく大丈夫」「動くはず」という推測による完了宣言は厳禁です。

## 検証ゲートの手順 (The Gate Function)

1. **検証コマンドの特定**: この変更が正常であることを証明するコマンド（`agent:check-worker`、Vitestテスト、Biomeリント）を特定する。
2. **実行**: コマンドを最新の状態で完全に実行する。
3. **出力の精読**: 終了コード（exit code 0）、失敗件数（0 failures）、エラーメッセージの有無を確認する。
4. **判定**:
   - 失敗がある場合: 完了とせず、実際のステータスとエラーログを報告して修正に進む。
   - 成功した場合: **実行したコマンドと検証結果（PASS）を証拠として明記**した上で完了を報告する。

## 危険な兆候（レッドフラグ）

- 「〜のはずです」「問題ないと思われます」「たぶん通ります」という曖昧な表現
- 検証コマンドを叩く前に「完了しました！」「完璧です！」とチャットに出力すること
- 前回の検証結果をそのまま引用し、最新の修正後に再実行していないこと
- スコープ外のエラーを無視すること
