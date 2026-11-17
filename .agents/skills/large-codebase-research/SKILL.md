---
name: large-codebase-research
description: "大規模リファクタリングや未知ドメイン調査の前に、ai:impact / ai:peek / ai:read で構造・影響範囲・必要ASTノードを最小トークンで蒸留して Artifact（research-<topic>.md）に保存し、新セッションの /plan 等へコピペ用プロンプト付きで引き継ぐトークン最適化ワークフロー"
---

# Large Codebase Research (調査カプセル分離ワークフロー)

大規模リファクタリングや多モジュール横断改修を同一コンテキスト内で設計・実装まで続けると、探索履歴が膨張してオートコンパクション（コンテキスト劣化）を引き起こします。
調査・監査セッションと計画セッション（`/plan`）を物理分離し、最小トークンで高精度な設計へ繋ぐためのプロトコルです。

## 1. ワークフロー

> **発動基準**: `/plan` 等の探索が **15〜20 ターン** を超える規模、または複数連番タスク（例: `TASK-XXXa`〜`c`）へ分割が必要な大規模リファクタリングでは、同一コンテキストで計画・タスク生成まで続行せず、本プロトコルで中間蒸留してセッション境界を切る。

### Step 1. 構造・影響範囲の決定論的抽出（調査フェーズ）
`.agents/rules/efficient-exploration.md` に従い、最小ターンで事実を収集する：
1. **影響・呼び出し元特定**: `bun run ai:impact <symbol|file>` および `rg -l '<symbol>' src/ extension/` で定義元・Consumers 全件・関連テストを特定する。
2. **構造・行範囲抽出**: `bun run ai:peek <file|dir> [Symbol]` で公開型・シグネチャ・`[L開始-L終了]` を把握する（250行超時は対象ファイルを絞って再実行）。
3. **ASTピンポイント一括抽出（`ai:read` 第一選択・大型 `read_file` 禁止）**: 設計判断に必須な関数・型本体を読む際は、**`read_file` ではなく `bun run ai:read <file1:Symbol1,Symbol2 file2:start-end file3:line...>`** を1ターンで並列一括実行する。`ls`/`fd`/`rg` 結果確認前の推測パス並列読込・100行超 `read_file` スライス・連続スライス（ページ送り）は厳禁とする。

### Step 2. 調査カプセルへの蒸留出力 (Artifact: `research-<topic>.md`)
調査結果を Artifact ディレクトリ（`<appDataDir>/brain/<conversation-id>/research-<topic>.md`）に書き出す。**コマンド生ログ・長大なソースコード・推測事項の貼り付けは禁止**し、以下の6項目に蒸留する：
1. **変更・置換対象一覧**: ファイルパス＋シンボル名＋行範囲アンカー（`path:L開始-L終了`）
2. **Consumers 全件リスト**: 同期更新が必要な呼び出し元ファイル全件
3. **公開インターフェースと型制約**: 公開型・関数シグネチャ・ホスト境界/DB制約
4. **Architectural Invariants**: 変更時に壊してはならない不変条件
5. **廃止・物理削除対象**: 二重持ち（フォールバック）を排して同時削除すべき旧ファイル/シンボル
6. **機械検証契約 (`Negative Contracts`)**: `tasks/TASK-*.md` へそのまま転記できる `rg: <pattern>` / `absent: <path>` 形式の検証条件

### Step 3. セッション境界の切断と引き継ぎプロンプト出力
Artifact 保存後は設計・タスク生成へ進まず調査セッションを終了し、ユーザーが次のクリーンセッション（`/plan` / `planner` / `tactical-architect` 等）へ**そのままコピペできる起動プロンプト**（保存した Artifact の絶対パス埋め込み済み）をコードブロックで出力する：
```text
/plan <保存したArtifactの絶対パス> を読み込み、記載された制約・Negative Contracts に従ってタスク化してください。
```
