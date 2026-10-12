---
name: efficient-exploration
description: "コード探索・ファイル読込におけるトークン効率化コマンドルーティングと読込品質ガード"
trigger: always_on
---

# 効率的探索・読込規約 (Token Efficiency & Quality Guard)

コード探索・差分確認におけるトークン消費とターン数を最小化するためのプロトコル。
最適化ツール群（`rtk`, `difft`, `eza`, `ast-grep`, `fd`, `jq`）の活用と、`src/odin` 標準の読込品質ガードを厳守せよ。

---

## 1. 黄金の3ステップ・探索パイプライン

ファイルを漫然と探さず、必ず以下の順序で絞り込む。

1. **【概観】マップで当たりをつける**
   - コマンド: `rtk read .agents/.cache/repo_map.txt`（無ければ `make map`）
   - 全体構造から調査対象ファイル（例: `src/auth.ts`）を特定する。広域検索（生 `grep`/`find`）は避ける。
2. **【特定】該当箇所を行番号レベルで検索する**
   - テキスト検索: `rtk grep '<keyword>' <file>`
   - 構文/AST検索: `ast-grep run -p '<pattern>' -l <lang> <file>`
   - 関数やクラスの位置を行番号で特定する。生コマンドでの無制限検索は禁止。
3. **【読込】目的に応じて読み分ける**
   - **調査・把握目的**: `rtk read -m <StartLine:EndLine> <file>`（または `rtk grep`）
   - **編集・実装目的**: 標準ツール `view_file` を使用。対象行の**前後5〜10行（親スコープ・インデント構造）を含めたのりしろ範囲**を無加工で正確に取得する。

---

## 2. 読込品質ガード（要約で意図を誤解せず、ターン浪費を防ぐ）

1. **ルール・設定・小型ファイルは無加工で全文読む**:
   - ルール文書（`AGENTS.md`, `.agents/rules/**`）、スキル定義（`SKILL.md`）、設定ファイル（`package.json`, `tsconfig.json` 等）、および**約300行以下のコードファイル**は、分割せず **1回の `view_file` で全文を取得**する。
   - 30〜60行刻みで小刻みに分割して直列読込することを固く禁ずる（API往復によるコンテキスト再読込の累積を防ぐため）。
2. **編集対象は無加工でのりしろ読込**:
   - ファイルを置換・編集する直前は、`rtk read` の圧縮・要約表示を使わず、必ず標準ツール `view_file` を用いてインデントや文字配列を「無加工」で読み込むこと。
3. **推測パスアクセスの絶対禁止（決定論的パス指定）**:
   - `view_file` に渡すパスは、直前のコマンド出力（`repo_map.txt`, `rtk git ls-files`, `rtk git status` 等）に現れた完全な相対パスをそのまま使用すること。
   - 存在が確認されていないパスの推測・合成・補完を禁止する。
4. **要約・切り詰めの表示を判断根拠にしない**:
   - `rtk grep` 等の上限切り詰め表示で曖昧さが残る場合は、該当箇所を無加工で再取得して確認すること。

---

## 3. コマンドルーティング (Command Map)

各アクションで必ず **Best** を選択し、必要時のみ **Fallback** を使用する。

| アクション | Best (最優先) | Fallback / 制限 |
| :--- | :--- | :--- |
| **全体把握 / 初手** | `rtk read .agents/.cache/repo_map.txt` | `make map` |
| **ディレクトリ把握** | `rtk ls <dir>` | `eza -T -L 2 --git-ignore <dir>` |
| **ファイル名探索** | `fd -t f '<pattern>' <dir>` | `rtk git ls-files '<pattern>'` / `rtk find <dir> -name '<glob>'` |
| **内容検索（テキスト）** | `rtk grep '<pattern>' <path>` | `rg -n -m 5 '<pattern>' <path>` |
| **構造検索（AST）** | `ast-grep run -p '<pat>' -l <lang>` | `rtk grep -t <lang> '<pattern>' <path>` |
| **JSONデータ抽出** | `rtk json --keys-only <file>` / `jq -c 'keys' <file>` | `jq -c '.[0:5]' <file>` / `rtk json -d 2 <file>` |
| **Git差分確認** | `GIT_EXTERNAL_DIFF=difft rtk git diff` | `rtk git diff -U0` |
| **Git状態・履歴** | `rtk git status` / `rtk git log -n 10 --oneline` | `git status -s` |
| **テスト/ビルドエラー** | `rtk err <cmd>` / `rtk test <cmd>` | `rtk log <file>` |

---

## 4. 制約・ガードレール

1. **生コマンドの原則禁止**: `ls`, `cat`, `grep`, `find`, `tree`, `git` の直接実行は禁止。必ず上記ルーティングに従う。
2. **`sg` コマンドの使用禁止**: 他ツール（Semgrep等）との衝突防止のため、AST検索は必ずフルネーム `ast-grep` で実行する。
3. **トークン爆発オプションの排除**:
   - `fd` での `-H`（隠しファイル走査）は禁止（除外指定時は `-I -E .git -E node_modules`）。
   - `jq -c .` などの全量ダンプは禁止。必ず `keys` や要素スライス（`.[0:5]`）で構造を絞る。
   - 出力が切り詰められた際は生コマンドへ逃げず、パターン・パス・`-m`（件数）・`-L`（深度）を絞って再実行する。
