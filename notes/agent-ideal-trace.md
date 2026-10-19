# エージェントログの理想トレース (Golden Trace)

本ドキュメントは、エージェントセッション（`transcript.jsonl`）におけるトークン効率と実行品質の測定基準（Budget）および理想的な行動パターンを定義するリファレンスです。

---

## 1. 採点基準 (Quality Budget)

エージェントセッションの評価スクリプト `bun run ai:report` は、各タスクセグメント（ユーザープロンプトごとの単位）に対して以下の指標で合否（ok / NG）を判定します。

| 評価指標 | 許容上限 (Budget) | 説明 |
|---|---|---|
| **ターン数 (turns)** | **≦ 6** (コミット作業は ≦ 3) | 1ターン毎にシステムプロンプト・ルール・会話履歴の全トークンが再読込（キャッシュリード）されるため、ターン数の肥大化が最大のコスト要因となります。 |
| **失敗呼び出し (fail)** | **0** | 誤ったランナー呼び出し（`PASS(0)` や存在しないパス、構文エラー）は即座にゼロに抑える必要があります。 |
| **コマンド再試行 (redo)** | **≦ 1** | 同一系統のコマンド（例: `bun -e` や差分取得）をパラメータ微調整のみで連続試行することを制限します。 |
| **単一読込の連続 (mergeable)** | **≦ 1** | 独立した状態確認（`status`, `log`, `view_file` など）は同一ターン内で並列ツール呼び出しするか、シェルで連結してターンを消費しないようにします。 |
| **1結果の最大サイズ (maxres)** | **≦ 1.5 KB** | 長大なエラーログや全ダンプを直接エージェントコンテキストに取り込まず、ファイルへ退避して要約のみを扱います。 |

---

## 2. タスク別ゴールデントレース

### パターン A: コミット依頼 (2〜3ターン)

変更内容のコミットを依頼された場合の理想的な進行例です。

**ケース 1: 新規セッション（変更内容を把握していない場合: 3ターン）**
```text
Turn 1: [run_command] rtk git status
        → 出力: 変更ファイル一覧を軽量確認し、コミットメッセージと対象パスを判定
Turn 2: [run_command] bun run ai:commit -m "<msg>" [paths]
        → 出力: "PREFLIGHT ok | files=3 | biome 0e/0w | tsc ok | bun-test 12✓"
               "[COMMIT OK] a1b2c3d feat: add feature"
               "## main...origin/main [ahead 1]"
Turn 3: 最終報告 (コミットSHA、検証ステータスを端的に伝達)
```

**ケース 2: 作業継続セッション（すでに変更内容を把握している場合: 2ターン）**
```text
Turn 1: [run_command] bun run ai:commit -m "feat: [TASK-001] <title>"
        → 出力: Preflight並列検証 + ステージング + コミット + ブランチ状態が1手で完了
Turn 2: 最終報告 (コミットSHA、完了ステータスを端的に伝達)
```

### パターン B: 調査・Q&A (≦ 4ターン)

特定の実装やエラー原因の調査を依頼された場合の理想的な進行例です。

```text
Turn 1: [並列呼び出し]
        - run_command: rtk git log -n 5 --oneline <path>
        - view_file: <target_file> (関心箇所の StartLine/EndLine 指定)
Turn 2: 調査結果の回答 (解決策・提案の提示)
```

### パターン C: タスク駆動開発ライフサイクル (TASK-*.md)

新機能の実装やリファクタリングをタスクファイル（`tasks/TASK-*.md`）駆動で進める場合の理想的な進行例です。

```text
1. [Planner] 起草 (Scaffold & Inject)
   - run_command: bun run task:new <num> <slug> [title]
   - replace_file_content: Context Snippets (Import Specs / Interfaces / Reference Pattern) & Phases 注入
   - ユーザーへ計画承認を要請 (HITL)

2. [Worker] 実装 (Zero-Exploration TDD)
   - invoke_subagent: worker (Model: flash)
   - Worker 内部: ai:check:red <test> ➔ コード実装 ➔ ai:check <file> PASS
   - Worker: Phase チェック [x] & Handoff Log を記入して親へ報告 ➔ Planner が Worker を即時 kill

3. [Reviewer] 審査 (Zero-Command 4大定性監査)
   - invoke_subagent: reviewer (Model: flash)
   - Reviewer: コマンドは実行せず git diff のみを閲覧。
     4大定性監査（要件網羅性、ホスト境界/Flicker、OCP設計負債、サイレント破壊）をチェックし Decision: LGTM を記入

4. [Planner] コミット & 完了報告
   - run_command: bun run ai:commit -m "feat: [TASK-XXX] <title>" [paths]
     → 内部で task:validate ＆ Preflight が自動検証され、1手で安全にコミット完了
```

---

## 3. なぜトークンが積み上がるのか（アンチパターン）

1. **手探りでの個別検証（直列ループ）**:
   - `vitest` → `bun test` → `biome` と個別に実行し、それぞれでエラーやログを確認すると、ターン数が増えてキャッシュトークンが数百K単位で累積します。
   - **対策**: `bun run ai:commit` または `bun run ai:preflight` でリポジトリ全体の検証（Biome, Scoped TSC, 関連テスト）を1手で完結させます。
2. **ロッシーフィルタ（`rtk test` / `rtk err`）の誤用**:
   - 本来テスト結果の末尾行だけを抽出するコマンドを汎用スクリプトに適用すると、情報欠落による「再実行・試行錯誤ループ」を引き起こします。
3. **独立した調査コマンドの直列実行**:
   - `git status` を見てから次のターンで `git diff` を打ち、その次のターンでファイルを閲覧するような直列実行は、ターン数とトークンを無駄に消費します。
