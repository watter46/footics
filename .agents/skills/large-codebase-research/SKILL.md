---
name: large-codebase-research
description: "大規模リファクタリングや未知ドメイン調査の前に、ai:impact / ai:peek で構造・影響範囲を蒸留して notes/research-<topic>.md カプセルに保存し、新セッションの /plan へ引き継ぐトークン最適化ワークフロー"
---

# Large Codebase Research (調査カプセル分離ワークフロー)

大規模リファクタリングや多モジュール横断改修を同一コンテキスト内で設計・実装まで続けると、探索履歴が膨張してオートコンパクション（コンテキスト劣化）を引き起こします。
調査セッションと計画セッション（`/plan`）を物理分離し、最小トークンで高精度な設計へ繋ぐためのプロトコルです。

## 1. ワークフロー

### Step 1. 構造・影響範囲の決定論的抽出（調査フェーズ）
`.agents/rules/efficient-exploration.md` に従い、最小ターンで事実を収集する：
1. **影響・呼び出し元特定**: `bun run ai:impact <symbol|file>` および `rg -l '<symbol>' src/ extension/` で定義元・Consumers 全件・関連テストを特定する。
2. **構造・行範囲抽出**: `bun run ai:peek <file|dir> [Symbol]` で公開型・シグネチャ・`[L開始-L終了]` を把握する（250行超時は対象ファイルを絞って再実行）。
3. **ピンポイント読込**: 設計判断に必須な箇所のみ `StartLine`/`EndLine` を指定した `read_file` で無加工確認する。

### Step 2. 調査カプセルへの蒸留出力 (`notes/research-<topic>.md`)
調査結果を `notes/research-<topic>.md` に書き出す。**コマンド生ログ・長大なソースコード・推測事項の貼り付けは禁止**し、以下の5項目に蒸留する：
1. **変更・置換対象一覧**: ファイルパス＋シンボル名＋行範囲アンカー（`path:L開始-L終了`）
2. **Consumers 全件リスト**: 同期更新が必要な呼び出し元ファイル全件
3. **公開インターフェースと型制約**: 公開型・関数シグネチャ・ホスト境界/DB制約
4. **Architectural Invariants**: 変更時に壊してはならない不変条件
5. **廃止・物理削除対象**: 二重持ち（フォールバック）を排して同時削除すべき旧ファイル/シンボル

### Step 3. セッション境界の切断と `/plan` 引き継ぎ
`notes/research-<topic>.md` 保存後は設計・タスク生成へ進まず調査セッションを終了し、ユーザーへ新規クリーンセッションでの `/plan @notes/research-<topic>.md` 実行を案内する。
