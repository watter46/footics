# 引継ぎサマリー: TOKEN-OPT-001 (実行ログから抽出したトークン浪費箇所と改善策の議論)

## 1. タスク概要
- **チケットID**: `TOKEN-OPT-001`
- **タスク名**: 実行ログから抽出したトークン浪費箇所と改善策の議論
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `AGENTS.md`
  - `.agents/skills/quality-harness/SKILL.md`
  - `.agents/scripts/type-check-scoped.js`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: 直前のタスク（L2-Arch-004）実行時のログを精査し、エージェントの無駄なツール呼び出しや設定不備によるトークン浪費パターンを抽出した。この改善議論を実装チャットと切り離して新規チャットで集中議論するため。
- **試行して破棄したアプローチ**: 同一会話内での反省・改善ルールの即時追記（コンテキスト肥大化防止のため別チャットへ分離）。

---

## 3. 実行ログから抽出された具体的なトークン浪費ポイント（課題）

### ① `manage_task` (status) による不要なポーリングループの発生
- **事象**: `WaitMsBeforeAsync: 5000` を指定しているにもかかわらず、コマンドがバックグラウンドに回った直後に `manage_task(status)` を連続実行（1s後、2s後、3s後）して結果を待機していた。
- **原因/改善案**: 
  - システムにはバックグラウンドタスク完了時の自動通知（Reactive Wakeup）が備わっており、「バックグラウンド実行後はツール呼び出しを停止して待つ（No Polling）」ルールが行動指針にあるが徹底されていない。
  - ルールまたはプロンプトフックで「バックグラウンド起動直後の即時 polling 禁止」を強化するか、`WaitMsBeforeAsync` の上限調整が必要。

### ② `write_to_file` の `ArtifactMetadata` 誤付与によるエラーリトライ
- **事象**: `write_to_file` でソースコード（`src/...`）を作成する際、`ArtifactMetadata` を渡したため「artifacts must be in /home/.../brain/...」というパーミッションエラーが発生し、再呼び出しでトークンを消費した。
- **原因/改善案**: ソースコード作成時は `ArtifactMetadata` は不要（brain 配下の artifact 作成時のみ必要）であることをツール利用ルールとして明確化。

### ③ RTK の Filters 無効化警告による出力肥大化
- **事象**: 全てのコマンド実行ログに `[rtk] WARNING: .rtk/filters.toml changed since trusted. Run rtk trust to re-review.` が表示され、ターミナル出力フィルタが効いておらず余分なログトークンが流入した。
- **原因/改善案**: 開発環境で `rtk trust` を事前実行しておくか、hook/スクリプト側で自動更新する仕組みが必要。

### ④ scoped type-check のスコープ漏れ・隣接エラー巻き込み
- **事象**: `type-check:scoped` に `unified-canvas.tsx` を含めた際、関係のない `panels/hud/` の既存エラー（10件）を拾ってしまい、調査のためのファイル参照ツール呼び出しが複数回発生した。
- **原因/改善案**: `type-check:scoped` の依存解決アルゴリズムの改善、または変更対象ファイル単体（最小単位）での検証徹底。

### ⑤ closure subagent の二重完了通知
- **事象**: closure agent が完了報告メッセージを送信した後、システムメッセージ経由でも同一の完了通知が再送され、メインエージェントが同一報告を2回出力した。
- **原因/改善案**: Closure Agent との連携メッセージングフローの整理。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
- **現状**: ログ抽出・課題整理完了。

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. 上記5点のトークン浪費要因に対する具体的なルール改定案（`AGENTS.md` / `rtk` 設定 / pre-tool hook / スクリプト）の策定。
2. `rtk trust` の運用見直しと自動化。
3. `type-check:scoped` の精度向上。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
直前のエージェント実行ログから抽出した「トークン浪費箇所の改善案（TOKEN-OPT-001）」について議論とルール/ツール改修を行いたいです。

### 前提コンテキスト
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handover/TOKEN-OPT-001-handover.md

### 抽出された主な課題
1. `manage_task(status)` による不要なポーリング待ち
2. `write_to_file` での `ArtifactMetadata` 誤指定によるエラーリトライ
3. `rtk trust` 未実行によるフィルター無効化と警告ログの流入
4. `type-check:scoped` が無関係なファイルを巻き込んでエラー過多になる問題
5. Closure Agent の二重通知

上記サマリーファイルを確認し、それぞれの根本原因の防止策（AGENTS.mdのプロトコル更新やスクリプト改修）について改善案を提案してください。
```
