---
name: verification-before-completion
description: 作業完了の宣言、コミット、レビュー依頼の前に、最新の検証コマンドを実行し exit code 0 の証拠を確認・提示するスキル
---

# Verification Before Completion (完了前検証スキル)

## 概要 (Overview)

作業の完了宣言、コミット、レビュー依頼を行う前に、必ず検証コマンドを最新の状態で実行し、出力結果（エビデンス）を確認した上で主張を行うための規約です。

## 鉄の掟 (The Iron Law)

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
(最新の検証エビデンスなしに、完了を宣言してはならない)
```

直前に検証コマンドを実行していない場合、「パスしました」「完了しました」と主張してはなりません。「おそらく大丈夫」「動くはず」という推測による完了宣言は厳禁です。

## ロール別検証ゲートの手順 (The Gate Function)

### 1. Worker エージェント
- **検証コマンド**: `bun run agent:check-worker <変更ファイル群>`
- **基準**: Biome、TypeScript (Scoped)、Vitest のすべてが exit code 0 でパスすること。
- **報告義務**: `send_message` による完了報告メッセージ内に、PASS した旨を明記すること。

### 2. Reviewer エージェント
- **検証コマンド**: `bun run agent:check-reviewer <全変更ファイル群>`
- **基準**: 上記に加えて Dependency Cruiser の依存関係グラフ検証を含め exit code 0 でパスすること。
- **報告義務**: タスクファイルの `## 4. Reviewer Checklist & Assessment` に結果を記録し、LGTM / REJECTED を判定すること。

### 3. Planner / メインエージェント
- **検証コマンド**: `bun run agent:preflight`
- **基準**: コミット前に手探りせず preflight を叩き、未コミット差分が全件 PASS することを確認すること。

## 危険な兆候（レッドフラグ）

- 「〜のはずです」「問題ないと思われます」「たぶん通ります」という曖昧な表現
- 検証コマンドを叩く前に「完了しました！」「完璧です！」とチャットに出力すること
- 前回の検証結果をそのまま引用し、最新の修正後に再実行していないこと
- スコープ外のエラーを無視すること
