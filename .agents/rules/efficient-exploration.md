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

1. **【特定・構造抽出】マップとシグネチャから一発で対象を絞り込む（最優先・1手完了）**
   - **全体把握・初手**: `rtk read .agents/.cache/repo_summary.txt`（高レベル地図。30行程度でアーキテクチャ・モジュールを最少トークンで把握）
   - **シンボル地図検索**: `bun run ai:find <keyword>`（全体マップから該当ファイルパスを1手で特定・次手ガイド付き）
   - **シグネチャ抽出（全文読込の代替・90%削減）**: `bun run ai:outline <file>`（exportされた型、interface、関数シグネチャを行番号付きで最少トークン抽出）
   - **広範囲調査の委譲（5ファイル以下は自前並列・6ファイル以上はScout委譲）**:
     - **5ファイル以下の調査**: Planner 自前の `bun run ai:outline <file>` や並列 `view_file` / `read_file` で直接確認する。
     - **6ファイル以上の広範囲調査**: 関連ソースファイルが 6 件以上に及ぶ場合、使い捨ての `Scout`（`TypeName: "scout"`, `Model: "flash_lite"`）に調査を一括委譲（最大6ターン完了）し、結果受領後に即 kill する。
     - **物理遮断ガード**: Planner が同一指示内で 6 ファイル目以降のソースコードを直接読込（`view_file` または `run_command` 経由の `rtk read`）しようとすると、フック（`view-filter`）により物理遮断（deny）される。
2. **【ピンポイント検索】該当箇所を行番号レベルで検索する**
   - テキスト検索: `rtk grep '<keyword>' <file>`
   - 構文/AST検索: `ast-grep run -p '<pattern>' -l <lang> <file>`
   - 関数やクラスの位置を行番号で特定する。生コマンドでの無制限検索は禁止。
3. **【読込】目的に応じて読み分ける**
   - **調査・把握目的**: `bun run ai:outline <file>` または `rtk read -m <StartLine:EndLine> <file>`
   - **編集・実装目的**: 標準ツール `view_file` を使用。
     - **400行以下の小型ファイル**: 分割せず `StartLine`/`EndLine` を省略して **1回で全文取得**する（Guardによりスライスは強制遮断される）。
     - **400行超のファイル**: `rtk grep` / `ast-grep` で特定した対象行の**前後5〜10行（親スコープ・インデント構造）を含めたのりしろ範囲**を無加工で正確に取得する。
      - **初手 `ai:outline` の義務**: 400行超のファイルの型・シグネチャ確認は、スライス読込の前に必ず `bun run ai:outline <file>` を初手で実行する。
      - **連続スライス（ページ送り）読込の禁止**: 同一ファイルを `StartLine`/`EndLine` の連続範囲（1-100 → 101-200 → …）で順に読み進めてはならない。同一ファイルへのページ送りが 3 回連続するとフック（`view-filter`）により物理遮断（deny）される。離れた範囲ののりしろ読込（grep で特定した行）は対象外。
4. **【抜け道コマンドの厳格禁止（Bypass Prohibition）】**
   - **`sed` / `awk` / `cut` / `strings` / `nl` / `tac` / `od` / `xxd` / `base64` / `wc` / `tail` の禁止**: ファイル読込制限や行数計測のバイパスとなるシェルコマンドはフックにより物理遮断（deny）される。
   - **`git log -p` の禁止**: パッチ形式でソース差分を大量出力する行為を禁止（特定コミットのファイル確認は `GIT_EXTERNAL_DIFF=difft rtk git show <hash> -- <file>` を使用。なお `git show <rev>:<path>` も調査ファイル数上限のカウント対象）。
   - **Planner の二重調査（Over-investigation）禁止**: 6 ファイル以上の調査は Scout に委任し、受領後は自力でファイルを読み直さず即座にタスク策定へ進むこと。

---

## 2. 読込品質ガード（要約で意図を誤解せず、ターン浪費を防ぐ）

1. **ルール・設定・小型ファイル（400行以下）は無加工で全文読む**:
   - ルール文書（`AGENTS.md`, `.agents/rules/**`）、スキル定義（`SKILL.md`）、設定ファイル（`package.json`, `tsconfig.json` 等）、および**400行以下のコードファイル**は、分割せず **1回の `view_file` で全文を取得**する（スライス指定はフックにより自動で全文読込に補正される）。
2. **推測パスアクセスの絶対禁止（決定論的パス指定）**:
   - `view_file` に渡すパスは、直前のコマンド出力（`repo_map.txt`, `rtk git ls-files`, `rtk git status` 等）に現れた完全な相対パスまたは絶対パスをそのまま使用すること。
   - 存在が確認されていないパスの推測・合成・補完を禁止する（未存在パスへのアクセスはハードガードにより即時遮断される）。
3. **編集対象は無加工でのりしろ読込**:
   - ファイルを置換・編集する直前は、`rtk read` の圧縮・要約表示を使わず、必ず標準ツール `view_file` を用いてインデントや文字配列を「無加工」で読み込むこと。
4. **要約・切り詰めの表示を判断根拠にしない**:
   - `rtk grep` 等の上限切り詰め表示で曖昧さが残る場合は、該当箇所を無加工で再取得して確認すること。

---

## 3. コマンドルーティング (Command Map)

**スコープ原則の厳守**: 通常時は必ず **通常（差分スコープ・セット実行）** を使用する。

| アクション | 通常（スコープ付き・既定） | Fallback |
| :--- | :--- | :--- |
| **全体把握 / 初手** | `rtk read .agents/.cache/repo_summary.txt` (高レベル地図) | `bun run map` |
| **型・シグネチャ高速把握 (90%削減)** | `bun run ai:outline [files]` (export・型抽出) | `ast-grep outline --view signatures` |
| **ファイル・シンボル特定** | `bun run ai:find <keyword>` | `rtk grep '<keyword>' .agents/.cache/repo_map.txt` |
| **実装中セット検証 (Lint+型+テスト)** | `bun run ai:check [files]` (差分または指定パス) | — |
| **コミット一括実行 (検証+ステージング+コミット)** | `bun run ai:commit -m "<msg>" [files]` | — |
| **コミット前一括検証 (検証のみ)** | `bun run ai:preflight [files]` | — |
| **自動フォーマット・Lint修正** | `bun run lint:fix` | — |
| **アプリ単体テスト (TDD RED)** | `rtk vitest run <path>` | `rtk err "vitest run ..."` |
| **エージェントテスト** | `bun test ./.agents` | `bun test ./<test-path>` |
| **ログセッション分析** | `bun run ai:report [id|latest]` | `rtk log <file>` |
| **依存・スクリプト把握** | `rtk deps <path>` / `rtk json --keys-only package.json` | `jq -c '.scripts' package.json` |
| **ディレクトリ把握** | `rtk ls <dir>` | `eza -T -L 2 --git-ignore <dir>` |
| **ファイル名探索** | `fd -t f '<pattern>' <dir>` | `rtk git ls-files '<pattern>'` |
| **内容検索（テキスト）** | `rtk grep '<pattern>' <path>` | `rg -n -m 5 '<pattern>' <path>` |
| **構造検索（AST）** | `ast-grep run -p '<pat>' -l <lang>` | `rtk grep -t <lang> '<pattern>' <path>` |
| **JSONデータ抽出** | `rtk json --keys-only <file>` / `jq -c 'keys' <file>` | `jq -c '.[0:5]' <file>` |
| **Git差分確認** | `GIT_EXTERNAL_DIFF=difft rtk git diff` | `rtk git diff -U0` |
| **Git状態・履歴** | `rtk git status` / `rtk git log -n 10 --oneline` | `git status -s` |

---

## 4. ターン予算と並列化 (Turn Budget & Parallelism)

1. **独立した調査の並列実行**:
   - 互いに依存しないコマンド（例: `git status`, `git log`, `view_file`）は、**同一ターン内で複数のツール呼び出しを発行**してターン数を削減する。
2. **コマンドの連鎖 (`&&`)**:
   - 順序依存のあるシェル操作（例: `git add <files> && git commit -m "..." && git status -sb`）は、`&&` で1回の `run_command` にまとめて実行する。
3. **コミットは手動操作せず `ai:commit` で1手完結**:
   - 個別に vitest, bun test, biome などを手動試行したり生 `git commit` を叩かず、`bun run ai:commit -m "<msg>" [paths]` で検証・ステージング・コミットを1手で完結させる（生 `git commit` はガードレールにより遮断される）。
4. **非可逆フィルタの誤用禁止**:
   - `rtk test` / `rtk err` はテストランナー専用の末尾抽出フィルタである。汎用スクリプトやログ確認に適用してはならない。
5. **自己評価**:
   - 必要に応じて `bun run ai:report latest` を実行し、自身のターン数・再試行数・トークン予算をチェックできる。詳細仕様は `notes/agent-ideal-trace.md` を参照。
