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

1. **【検索】マップから一発で対象ファイル・シンボルを特定する（最優先・1手完了）**
   - **全体把握・初手**: `rtk read .agents/.cache/repo_summary.txt`（高レベル地図。30行程度でアーキテクチャ・モジュール・エントリーポイントを最少トークンで把握）
   - **ピンポイント検索**: `rtk grep '<keyword>' .agents/.cache/repo_map.txt`（詳細シンボル地図。特定機能・関数のファイルパスを1手で特定）
2. **【特定】該当箇所を行番号レベルで検索する**
   - テキスト検索: `rtk grep '<keyword>' <file>`
   - 構文/AST検索: `ast-grep run -p '<pattern>' -l <lang> <file>`
   - 関数やクラスの位置を行番号で特定する。生コマンドでの無制限検索は禁止。
3. **【読込】目的に応じて読み分ける**
   - **調査・把握目的**: `rtk read -m <StartLine:EndLine> <file>`（または `rtk grep`）
   - **編集・実装目的**: 標準ツール `view_file` を使用。
     - **400行以下の小型ファイル**: 分割せず `StartLine`/`EndLine` を省略して **1回で全文取得**する（Guardによりスライスは強制遮断される）。
     - **400行超のファイル**: `rtk grep` / `ast-grep` で特定した対象行の**前後5〜10行（親スコープ・インデント構造）を含めたのりしろ範囲**を無加工で正確に取得する。

---

## 2. 読込品質ガード（要約で意図を誤解せず、ターン浪費を防ぐ）

1. **ルール・設定・小型ファイル（400行以下）は無加工で全文読む**:
   - ルール文書（`AGENTS.md`, `.agents/rules/**`）、スキル定義（`SKILL.md`）、設定ファイル（`package.json`, `tsconfig.json` 等）、および**400行以下のコードファイル**は、分割せず **1回の `view_file` で全文を取得**する。
   - 30〜60行刻みで小刻みに分割して直列読込することを固く禁ずる（ハードガード `guard.ts` により即座に deny される）。
2. **同一ファイルへの連続スライス読込（ページング）の禁止**:
   - 中・大規模ファイルであっても、同一ファイルに対して複数回連続して `view_file`（スライス指定）を呼び出す行為（ページング探索）を固く禁ずる。
   - 目的行の特定は事前に `rtk grep` / `ast-grep` で完了させること。連続スライスはハードガードにより検知・遮断される。
3. **推測パスアクセスの絶対禁止（決定論的パス指定）**:
   - `view_file` に渡すパスは、直前のコマンド出力（`repo_map.txt`, `rtk git ls-files`, `rtk git status` 等）に現れた完全な相対パスまたは絶対パスをそのまま使用すること。
   - 存在が確認されていないパスの推測・合成・補完を禁止する（未存在パスへのアクセスはハードガードにより即時遮断される）。
4. **編集対象は無加工でのりしろ読込**:
   - ファイルを置換・編集する直前は、`rtk read` の圧縮・要約表示を使わず、必ず標準ツール `view_file` を用いてインデントや文字配列を「無加工」で読み込むこと。
5. **要約・切り詰めの表示を判断根拠にしない**:
   - `rtk grep` 等の上限切り詰め表示で曖昧さが残る場合は、該当箇所を無加工で再取得して確認すること。

---

## 3. コマンドルーティング (Command Map)

**スコープ原則の厳守**: 通常時は必ず **通常（スコープ付き・既定）** を使用する。
**全体対象コマンド**（`:all` 系）は、ユーザーから「全体をチェックして」と明示指示された場合のみ使用が許可される。

| アクション | 通常（スコープ付き・既定） | 全体（ユーザー明示時のみ） / Fallback |
| :--- | :--- | :--- |
| **全体把握 / 初手** | `rtk read .agents/.cache/repo_summary.txt` (高レベル地図) | `make map` |
| **ファイル・シンボル特定** | `rtk grep '<keyword>' .agents/.cache/repo_map.txt` | `fd -t f '<pattern>' <dir>` |
| **静的解析 (Biome)** | `bun run lint [path]` (差分または指定パス) | `bun run lint:all` (明示時のみ) |
| **型チェック** | `bun run typecheck [path]` (差分または指定パス) | `bun run typecheck:all` (明示時のみ) |
| **一括検証 (Lint+Type)** | `bun run check [path]` (差分または指定パス) | `bun run check:all` (明示時のみ) |
| **Worker実装時検証** | `bun run agent:check-worker <files>` | — |
| **コミット前一括検証** | `bun run agent:preflight` | `bun run verify` |
| **依存・スクリプト把握** | `rtk deps <path>` / `rtk json --keys-only package.json` | `jq -c '.scripts' package.json` |
| **ディレクトリ把握** | `rtk ls <dir>` | `eza -T -L 2 --git-ignore <dir>` |
| **ファイル名探索** | `fd -t f '<pattern>' <dir>` | `rtk git ls-files '<pattern>'` |
| **内容検索（テキスト）** | `rtk grep '<pattern>' <path>` | `rg -n -m 5 '<pattern>' <path>` |
| **構造検索（AST）** | `ast-grep run -p '<pat>' -l <lang>` | `rtk grep -t <lang> '<pattern>' <path>` |
| **JSONデータ抽出** | `rtk json --keys-only <file>` / `jq -c 'keys' <file>` | `jq -c '.[0:5]' <file>` |
| **Git差分確認** | `GIT_EXTERNAL_DIFF=difft rtk git diff` | `rtk git diff -U0` |
| **Git状態・履歴** | `rtk git status` / `rtk git log -n 10 --oneline` | `git status -s` |
| **アプリ単体テスト** | `rtk vitest run <path>` | `rtk err "vitest run ..."` |
| **エージェントテスト** | `bun test ./.agents` | `bun test ./<test-path>` |
| **ログセッション分析** | `bun run agent:session-report [id|latest]` | `rtk log <file>` |

---

## 4. ターン予算と並列化 (Turn Budget & Parallelism)

1. **独立した調査の並列実行**:
   - 互いに依存しないコマンド（例: `git status`, `git log`, `view_file`）は、**同一ターン内で複数のツール呼び出しを発行**してターン数を削減する。
2. **コマンドの連鎖 (`&&`)**:
   - 順序依存のあるシェル操作（例: `git add <files> && git commit -m "..." && git status -sb`）は、`&&` で1回の `run_command` にまとめて実行する。
3. **コミット前は手探りせず `preflight`**:
   - 個別に vitest, bun test, biome などを手動試行せず、`bun run agent:preflight` で一括検証する。
4. **非可逆フィルタの誤用禁止**:
   - `rtk test` / `rtk err` はテストランナー専用の末尾抽出フィルタである。汎用スクリプトやログ確認に適用してはならない。
5. **自己評価**:
   - 必要に応じて `bun run agent:session-report latest` を実行し、自身のターン数・再試行数・トークン予算をチェックできる。詳細仕様は `notes/agent-ideal-trace.md` を参照。
