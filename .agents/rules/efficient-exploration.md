---
name: efficient-exploration
description: "コード探索・ファイル読込におけるトークン効率化コマンドルーティングと読込品質ガード"
trigger: always_on
---

# 効率的探索・読込規約 (Token Efficiency & Quality Guard)

コード探索・差分確認におけるトークン消費とターン数を最小化するためのプロトコル。
Scout サブエージェントは廃止されており、Planner / Brainstormer / Architect が以下の決定論的ツール群を直接組み合わせて最小ターンで探索を完結させる。

---

## 1. 黄金の3ステップ・探索パイプライン

ファイルを漫然と探さず、必ず以下の順序で絞り込む。

1. **【特定・構造抽出】マップ・全件検索・シグネチャ抽出で1手で対象を絞り込む**
   - **全体把握・初手**: `rtk read .agents/.cache/repo_summary.txt`（高レベル地図）
   - **シンボル定義元の特定**: `bun run ai:find <keyword>`（全体マップから該当ファイルパスを1手特定）
   - **呼び出し元（Consumer）の全件網羅特定（切り詰めなし）**:
     - `rg -l '<symbol>' src/ extension/`（該当シンボルを参照している全ファイルパス一覧を省略なしで取得）
     - `rg -c '<symbol>' src/ extension/`（ファイルごとの参照件数を取得）
   - **シグネチャ・行番号・内部importの一括抽出（全文読込の代替・90%削減）**:
     - `bun run ai:outline <file1> [file2 ...]`（複数ファイルまたはディレクトリを一括指定可能。`export const` の React `memo` / アロー関数本体を自動折りたたみし、`[L開始-L終了]` 行番号と内部 import 一覧のみを抽出する）
2. **【ピンポイント検索】該当箇所を行番号レベルで検索する**
   - テキスト検索: `rtk grep '<keyword>' <file>`
   - 構文/AST検索: `ast-grep run -p '<pattern>' -l <lang> <file>`
3. **【読込】ファイルサイズに応じて全文取得と行指定を使い分ける**
   - **ファイル数上限の撤廃**: Planner が必要なファイルをすべて自前で確認できるよう、旧5ファイル上限は撤廃されている。独立した複数ファイルの `read_file` は同一ターン内で並列実行すること。
   - **400行以下のファイル（リポジトリの95%）**: `StartLine`/`EndLine` を省略して **1回の `read_file` で全文取得**する（細切れに複数ターン読むと会話履歴の再送でトークンが何倍も浪費されるため、小型ファイルのスライス指定はフックにより自動で全文読込に補正される）。
   - **400行超の大型ファイル**:
     - 初手で必ず `bun run ai:outline <file>` を実行して `[L開始-L終了]` 行番号を把握する。
     - 必要な関数の行範囲（前後5〜10行ののりしろ込み）のみを `read_file` で取得する。
     - **連続スライス（ページ送り）読込の禁止**: 同一ファイルを `1-100 ➔ 101-200 ➔ 201-300` のように3回連続でページ送り読込するとフック（`view-filter`）により物理遮断される。
4. **【抜け道コマンドの厳格禁止（Bypass Prohibition）】**
   - **`sed` / `awk` / `cut` / `strings` / `nl` / `tac` / `od` / `xxd` / `base64` / `wc` / `tail` の禁止**: フックにより物理遮断される。
   - **`git log -p` の禁止**: パッチ形式でソース差分を大量出力する行為は禁止（`GIT_EXTERNAL_DIFF=difft rtk git show <hash> -- <file>` を使用）。

---

## 2. 読込品質ガード

1. **推測パスアクセスの絶対禁止（Ghost Path Guard）**:
   - `read_file` に渡すパスは、`ai:find`, `rg -l`, `fd`, `rtk git status` 等で確認された実在パスのみを使用すること。未存在パスへのアクセスはフックにより即時遮断される。
2. **編集対象は無加工で読込**:
   - ファイルを編集する直前は、必ず `read_file` を用いて対象箇所のインデントや文字配列を無加工で確認すること（未読ファイルへの上書き編集は `gateguard` により遮断される）。

---

## 3. コマンドルーティング (Command Map)

| アクション | 標準コマンド | 備考 |
| :--- | :--- | :--- |
| **全体把握 / 初手** | `rtk read .agents/.cache/repo_summary.txt` | 高レベル地図 |
| **型・シグネチャ・行番号一括抽出** | `bun run ai:outline <files-or-dir...>` | `[L開始-L終了]` 行番号＋内部 import 付き |
| **シンボル定義元の特定** | `bun run ai:find <keyword>` | `repo_map.txt` 高速検索 |
| **呼び出し元（Consumer）の全件特定** | `rg -l '<pattern>' src/ extension/` | 切り詰めなしで全ファイル特定 |
| **行内容の検索** | `rtk grep '<pattern>' <path>` | コード内容の検索 |
| **Phase 単位の高速チェック（Worker用）** | `bun run ai:check <files...>` | Guardrails + Biome (`--write`) + Scoped tsc + 担当テスト実行 |
| **最終一括検証（Planner用）** | `bun run ai:preflight` | 全体 `tsc` + 関連 `vitest` + `depcruise` + サイズ検査 |
| **最終コミット一括実行（Planner用）** | `bun run ai:commit [-m "<msg>"] [files]` | `task:validate --verify-contracts --require-done` + `ai:preflight` + コミット |
| **タスクファイル検証（Planner用）** | `bun run task:validate <tasks/TASK-XXX.md>` | `Commit:`・`Execution Waves`・`Negative Contracts`・サイズ上限検査 |
| **エージェントテスト** | `bun test ./.agents` | `.agents` フック・スクリプトの検証 |
| **Git差分確認** | `GIT_EXTERNAL_DIFF=difft rtk git diff` | 構造的 diff 表示 |
