---
name: efficient-exploration
description: "コード探索・ファイル読込におけるトークン効率化コマンドルーティングと読込品質ガード"
trigger: always_on
---

# 効率的探索・読込規約 (SSOT)

## 1. 探索・読込パイプライン（最大 2〜3 ターン完結）
1. **Step 1: 位置・影響特定（1ターンで複数起点を一括解決）**
   - シンボル・ファイル既知: `bun run ai:impact <symOrFile1> [symOrFile2...] [--scope <dir>]` で定義元・実利用 Consumers（`[in <内部関数名> L開始-L終了]` 付き、import行除外）・関連テストを一括特定（200行上限）
   - キーワードのみ: `rg -l '<pattern>' src/ extension/`（ピンポイント行は `rtk grep` / `ast-grep`）
2. **Step 2: 構造・内部シンボル特定（`ai:impact` で内部シンボル・行範囲が判明済みならスキップ）**
   - `bun run ai:peek <file1|dir1> [file2...]` で複数ファイルの import・公開型（12行超は自動折りたたみ）・**25行以上の関数/コンポーネント/Store内部の1階層メンバー（`useCallback`/`useMemo`/`useEffect`/Storeアクション/`return`）の `[L開始-L終了]`** を一括抽出（250行上限）
3. **Step 3: コード実体読込（第一選択: `bun run ai:read`）**
   - **100行超の `.ts` / `.tsx` / `.js` / `.jsx` を読む際、Planner / Brainstormer / Architect は原則 `read_file` を使わず `bun run ai:read <file1:InnerSymbol1,InnerSymbol2 file2:start-end file3:line...>` で必要な内部シンボル・範囲のみを1ターンで並列一括抽出する**（全体250行上限）
   - 120行超の巨大親コンポーネント名を直接指定した場合は自動的に内部構造（Auto-Peek）へ縮退するため、必ず内部ハンドラ名または狭い行範囲（`<=120` 行）を指定する（`:行番号` 指定時は分割代入・`useEffect`・`return` を含む最小親ASTノードが自動抽出される）
4. **`read_file` の限定適用と物理ガード遮断**:
   - **`read_file` 適用対象**: 非コード・仕様ファイル（`tasks/`, `.agents/`, `docs/`, `*.md`, `*.json` 等）、100行以下の小規模ファイル、または Worker が担当 `Target Files` / `Reference Files` を実装前に読む場合
   - **物理ガード遮断対象**: Planner / Architect による `>100` 行 TS/JS コードへの全文 `read_file`・`>100` 行の大型スライス `read_file`・連続ページ送りスライス・`cat`/`rtk read` による TS/JS 丸読み・編集なし重複読込・推測パス（Ghost Path）読込
   - **禁止コマンド**: `sed`/`awk`/`cut`/`strings`/`nl`/`tac`/`od`/`xxd`/`base64`/`wc`/`tail`・`git log -p` 禁止。編集直前の無加工 `read_file` または `ai:read` 必須

## 2. Command Map
| アクション | コマンド |
| :--- | :--- |
| 定義元・Consumers・関連テスト一括特定 | `bun run ai:impact <symOrFile1> [symOrFile2...] [--scope <dir>]` |
| 構造・型・内部ハンドラ/テストブロック一括抽出 | `bun run ai:peek <file1\|dir1> [file2...]` |
| AST生コード並列抽出（内部シンボル/範囲/行） | `bun run ai:read <file[:Symbol\|start-end\|line]...> [--symbol S1,S2]` |
| 参照ファイル一覧（切り詰めなし） | `rg -l '<pattern>' src/ extension/` |
| ピンポイント行検索 / AST検索 | `rtk grep '<pattern>' <path>` / `ast-grep` |
| Phaseチェック（Worker） | `bun run ai:check <files...>` |
| 最終検証 / コミット（Planner） | `bun run ai:preflight` / `bun run ai:commit` |
| タスク検証 / エージェントテスト | `bun run task:validate <file>` / `bun test ./.agents` |
