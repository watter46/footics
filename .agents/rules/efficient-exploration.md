---
name: efficient-exploration
description: "コード探索・ファイル読込におけるトークン効率化コマンドルーティングと読込品質ガード"
trigger: always_on
---

# 効率的探索・読込規約 (SSOT)

## 1. 探索・読込パイプライン
1. **影響・参照特定**: `bun run ai:impact <symbol|file>` / `rg -l '<symbol>' src/ extension/` で定義元・Consumers・関連テストを特定
2. **構造確認（250行超はファイル一覧へ縮退）**: `bun run ai:peek <file|dir> [Symbol]` で公開型・import・`[L開始-L終了]`（テストは `describe/it`）を抽出
3. **範囲指定読込**: `read_file` は 150行以下を一括読込。150行超コードは事前 `ai:peek`/`ai:impact`/`rg` 必須（無探索丸読み遮断）＋`StartLine`/`EndLine` 指定推奨。連続3回ページ送り禁止
4. **禁止コマンド**: `sed`/`awk`/`cut`/`strings`/`nl`/`tac`/`od`/`xxd`/`base64`/`wc`/`tail`・`git log -p`・推測パス（Ghost Path）禁止。編集直前の無加工 `read_file` 必須

## 2. Command Map
| アクション | コマンド |
| :--- | :--- |
| 定義元・Consumers・関連テスト | `bun run ai:impact <symbol\|file>` |
| 構造・型・テストブロック抽出 | `bun run ai:peek <file\|dir> [Symbol]` |
| 参照ファイル一覧（切り詰めなし） | `rg -l '<pattern>' src/ extension/` |
| ピンポイント行検索 / AST検索 | `rtk grep '<pattern>' <path>` / `ast-grep` |
| Phaseチェック（Worker） | `bun run ai:check <files...>` |
| 最終検証 / コミット（Planner） | `bun run ai:preflight` / `bun run ai:commit` |
| タスク検証 / エージェントテスト | `bun run task:validate <file>` / `bun test ./.agents` |
