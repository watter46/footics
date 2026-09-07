---
trigger: always_on
---

# エージェント行動指針 (MANDATORY)

このプロジェクトを操作するエージェント（Antigravity）は、以下のルールを **必ず読み込み、例外なく最優先で遵守すること**。

## 0. 開発組織「Regista」と実行モード (Execution Modes)
本プロジェクトは自律型AIエンジニア組織「Regista」規約に基づいて運用されます。**コード変更を伴う全タスクは規模に関わらず例外なくOrchestrated Modeで実行すること（Fast-Track廃止）。**

- **質問・相談・設計壁打ち (即時回答モード):**
  - **対象:** 日常の質問、技術相談・調査、設計の壁打ち、方針確認。コード変更を伴わないもの全般。
  - **挙動:** テスト・型チェック・Biomeなどの検証コマンドは**一切実行せず、即座に回答を出力して完了**する。サブエージェントの召喚も不要。

- **Orchestrated Mode (全コード変更タスク共通・唯一の実行モード):**
  - **対象:** コード変更を伴う**全て**のタスク（1行修正・typo修正・大型機能追加を問わず例外なし）。
  - **挙動:** [ORGANIZATION.md](./ORGANIZATION.md) に定義された State Machine (TRIAGE → DESIGN → IMPLEMENTATION → REVIEW_QA → DONE) に従って分業する。GMは必ずScoutへ探索を委譲し、チケットを発行してWorkerに実装させる。GMが直接コードに触れることを絶対に禁ずる。
  - **GMタスク分解・チケット発行 (DAG & Markdown Tickets):** GM (`regista-gm`) は要件受領時にタスクを極小AAWU（1〜3ファイル単位）へ分解し、並列実行可能なDAG構造として `.regista/tickets/[ID].md` にチケットを発行する。

## 1. チケット出力・運用プロトコル (DAG & Markdown Distribution Standard)
- **1. 分散Markdownファイル管理 (`.regista/tickets/[ID].md`):**
  - 各チケットは **必ず** `.regista/templates/task-ticket.md` を読み込み、それをベースに生成すること。YAMLフロントマター内の `model`, `effort`, `code_snapshot` などの必須フィールドを絶対に省略してはならない。
  - ファイル構成案（純粋関数と状態の分離など）を必ず明記すること。
  - **チケット発行後バリデーション義務 (MANDATORY GATE):** GMはチケットファイルを保存した直後に、必ず `rtk pnpm tickets:validate` を実行し、スキーマ・DAG検証を通過させること。エラーが残る場合は通過するまでチケットを修正し、**バリデーション合格前にWorkerへの実行指示を絶対に行ってはならない**。
- **2. Layer-Based DAG ID体系と並列実行の厳格化:** `L{深度}-{ドメイン名}-{連番3桁}`。進捗確認は `pnpm tickets`。
  - **並列実行の担保**: L{x}（レイヤー）は「完全に独立して並列実行可能な単位」を示す。GMはタスクを分解する際、**同一レイヤー内のチケット同士で変更対象ファイルが絶対に重複しないよう**厳密に分割しなければならない（ユーザーが別チャットでWorkerを並列稼働させるため）。
  - **GMのコード実装権限剥奪 (ABSOLUTE PROHIBITION):** GMはチケット（Markdown）の発行とバリデーション実行のみに専念する。**コードの読み書き・ファイル編集・シェルコマンド実行（バリデーション以外）は一切禁止**。違反した場合、そのGMセッションは即時終了とみなす。
  - **絵文字によるレイヤー可視化**: チケット一覧を出力する際、同じレイヤーのチケットIDの左には**必ず同じ色の絵文字**（例: L1は🟢、L2は🟡など）を明記し、レイヤーの境界を視覚的に明確にすること。
- **3. モデルとEffortの選定 (ホワイトリスト):**
  - **チケット発行 (GM)**: `Gemini 3.1 Pro [high]` または `Gemini 3.8 Flash [high]`。
  - **実装Worker (基本)**: `Gemini 3.7 Flash` を基本とし、タスク規模に応じて `Gemini 3.7 Flash` 〜 `Gemini 3.8 Flash` の6段階（各 low / medium / high）で使い分ける。
  - **実装Worker (難関)**: それでも難しい場合（アーキテクチャ刷新や難解バグ等）は `Claude Sonnet 4.6 (thinking)` などのSonnet系モデルを使用する。
- **4. 会話分離の原則 (Cross-Conversation Execution Isolation):** チケット発行は「企画/GM Conversation」、実装は必ず「別の新規Conversation」で実施する。
- **5. 出力の完全テンプレート化 (No Hardcoding):** 
  - エージェントがチャットに出力する全ての報告（チケット一覧、実装完了、コミット完了、引継ぎ等）は、**エージェント自身でハードコードした独自フォーマットを使ってはならない。**
  - 必ず事前に `.regista/templates/` 配下の該当テンプレート（`board-summary.md`, `completion-report.md`, `ticket-done-report.md`, `handover-report.md` 等）を読み込み、指定された変数のみを埋め込んで出力すること。
  - YAMLの内容をそのままチャットに出力したり、不要な挨拶や「〜を修正しました」等の冗長なまとめを付加することを厳格に禁止する。ユーザーへの出力はテンプレートに沿った最小限のものに留める。

## 2. エージェント行動規範とナレッジの遅延読み込み
- **Chain of Thought (CoT) Enforcement**: 浅い思考によるバグを排除し、深く考えてから行動する。複雑な修正やデバッグの際はいきなりコードを修正せず、思考プロセスを出力し、依存関係、副作用、代替案を検討する。
- **Self-Correction & Cleanup**: エラーが発生した場合は自律的に修正し、一時ファイルはタスク完了時に削除する。
- **Knowledge Maintenance (遅延読み込みの徹底)**: トークン浪費を防ぐため、詳細なアーキテクチャやコーディング規約は以下から必要に応じて `view_file` で読み込むこと。
  - **プロジェクト全体の設計・実装ルール:** `.agents/knowledge/architecture-and-guidelines.md`
  - 構造把握: `rtk find` や `rtk grep`、内蔵検索ツールを活用する。捏造せず実在確認する。

## 3. トークン効率とコンテキスト防衛ガードレール (MANDATORY)
トークンの爆発的消費を防ぐため、以下のルールを厳格に守ること。
- **コマンド実行の `rtk` ラップ義務化**: エージェントがCLIコマンドを実行する際は、コンテキストの肥大化を防ぐため**必ず `rtk` (Regista Toolkit) 経由で実行すること**。裸でのコマンド実行は固く禁ずる。
  - **ビルド・テスト・Lint**: `rtk pnpm`, `rtk vitest`, `rtk tsc`, `rtk biome` など
  - **Git操作**: `rtk git diff`, `rtk git status`, `rtk git log`, `rtk gh` など
  - **ファイル・ディレクトリ調査**: `rtk ls`, `rtk tree`, `rtk find`, `rtk grep`, `rtk read <file>`, `rtk smart <file>` など
  - **データ・ネットワークデバッグ**: `rtk json`, `rtk curl`, `rtk env` など
  - **汎用エラー/ログ抽出**: `rtk err <command>`, `rtk test <command>`, `rtk log` など
  ※現在、安全フック（PreToolUse）により `rtk` を経由しない生のコマンド（特に `pnpm`, `vitest`, `tsc`, `biome` 等）は**強制的に実行ブロック（deny）される**ようになっています。Gitやファイル操作等の日常コマンドにおいても、上記に挙げた `rtk` サブコマンドを優先的に使用し、トークン消費を最小化してください。
- **ツール入力制約の厳格化 (view_file & 検索)**: 
  - **view_file制約**: 100行を超えるファイルに対し、引数なしでの全行読み込みを禁止する。構造把握が目的の場合は、必ず `StartLine` と `EndLine` を指定し、50行程度のチャンクに分割して読み込むこと。
  - **検索制約**: `grep_search` や `find_by_name` を実行する際は、必ず `SearchPath` を指定し、プロジェクトルート(`.`)での全域検索を禁止する。また `MaxDepth` を適切に設定すること。
- **スコープ限定テスト・検証**: テストは `rtk vitest run <対象パス>`、型チェックは `rtk pnpm type-check:scoped <変更ファイル>` を用いる。`rtk tsc --noEmit` の全体実行は厳禁。
- **コマンド出力のサイレント化 (/dev/null の活用)**: `git status`, `git add` などのシェルコマンドを実行する際、結果の詳細が不要な場合は必ず `> /dev/null 2>&1` を付与してコンテキストへの出力を捨てるか、`git diff --stat` 等を用いて出力を最小限に留めること。エージェント自身の履歴を巨大なターミナルログで汚染してはならない。

## 4. コンテキストの分割・引継ぎプロトコル (Conversation Slicing)
会話が長引くとトークンが爆発的に消費されます。以下の条件で自律的にチャットを分割してください。
- **手詰まり時 (HANDOVER ON IMPASSE):** 2往復以上意図が噛み合わず手詰まりになった場合、無理に修正を繰り返さず、自律的に引継ぎを提案するか、ユーザーからの「引継ぎ」指示で引継ぎを実施する。
- **順調な場合の定期的なチャットリセット:** 大幅なリファクタリング等で、1つのチャット内で3つ以上のコンポーネントを修正、またはテスト/型チェックのループを3ターン以上繰り返した場合、コンテキストの肥大化を防ぐため、**完了報告の前に自発的に現在の進捗を一度コミットし、別チャットへ引き継ぐ（またはサブエージェントに後続を委譲する）**こと。
- **引継ぎ出力の厳格な分離:** 引継ぎを行う際は、以下の2ステップを厳守すること。
  1. `.regista/templates/handover.md` に基づき、`.regista/handover/[ID]-handover.md` を **ファイルとして作成・保存 (write_to_file)** する。
  2. チャット画面（ユーザーへの返答）には、作成したファイルの中身や「新規チャット用プロンプト」等を **絶対にダラダラと出力してはならない**。必ず `.regista/templates/handover-report.md` を読み込み、ファイルへのリンクのみを記載した最小限のメッセージで完了すること。

## 4.5. Worker Fail-Fast 差し戻しプロトコル (MANDATORY)
実装Workerは、チケット（`.regista/tickets/[ID].md`）に記載された情報だけで実装が完結できない場合、以下のプロトコルを厳格に遵守すること。

### Worker に許可された探索操作（スコープ制限）
- `target_files` / `reference_files` に明記されたファイルへの `view_file`（ピンポイントの行範囲指定必須）
- 同一ファイル内での `grep_search`（SearchPathを該当ファイルパスに限定）
- **絶対禁止**: `src/`、`src/features/` 等のルートディレクトリを `SearchPath` に指定した広域検索
- **絶対禁止**: チケットの `target_files` / `reference_files` 外のディレクトリへのアクセス

### 情報不足を検知した場合の正しい挙動（Fail-Fast 中断）
1. **実装・探索を即座に停止する**（Search連打・推測での実装は厳禁）
2. **チケットの `status` を `BLOCKED` に更新する**
3. **Write-back Log の `### ⚠️ Escalation & Missing Info` セクションに以下を記入して保存する**:
   - `Blocked Reason`: 不足している情報を1〜2行で記述
   - `Missing for Scout`: Scoutが調査すべき具体的な情報を箇条書き
4. チャットに以下の1行を出力して **即座に終了する**:
   ```
   ⚠️ チケット前提不備のため作業を中断しました。オーナーは「retry {チケットID}」でGMにリカバリを指示してください。
   ```

### Worker の探索禁止ルール（絶対遵守）
- Workerは自力でのコードベース広域探索を行わない。必要な情報はすべてチケットに記載されているはず。
- 「チケットに書いていない情報を探しに行く」行為は規約違反とみなす。
- Scoutを自律的に呼び出すことも禁止（Workerチャットのコンテキスト汚染・肥大化を引き起こすため）。
- 情報が足りない場合の唯一の正しい行動は「Fail-Fast中断（BLOCKED更新）」のみ。

### `retry {チケットID}` リカバリフロー
Workerが差し戻した後、オーナーがGMのチャットで `retry {チケットID}` を入力すると、GMが自律的にチケット詳細化（Scout再調査→チケット更新）を完遂する。
詳細は `regista-gm` スキルの「### 11. retry {ID} 自律リカバリプロトコル」を参照。

## 5. 完了事務作業のCLI実行方式 (CLI-First Closure Protocol)
実装Workerは、チケット完了時のコミット・ステータス更新を **CLI ツール (`make done`) に完全委譲** する。サブエージェントの呼び出しは不要。

### Worker Write-back プロトコル (MANDATORY)
実装Workerは作業完了時に以下を **必ず** 実行すること：
1. `## 📝 Implementation & Write-back Log` セクションに実際の変更内容・検証結果を記入する（テンプレートの空欄のまま放置は禁止）。
   ※`make done` 実行時に、Write-back の「変更ファイル一覧」と `git status` の実差分が突合検証されます。未記載の変更ファイルがある場合コミットがブロックされるため、実際に変更したファイルを正確に記載してください。
2. チケットの `status` は変更せず（`IN_PROGRESS` のまま）、ステータスの `DONE` 更新および Git コミットは `make done`（CLI）に委譲する。
3. チャットに以下のフォーマット（最大3行）で出力して**即座に終了する**（コミット処理は行わない）:
   ```
   ✅ 実装完了。オーナーは `make done {チケットID}` でコミットしてください。
   - **変更内容**: <変更概要を1行で簡潔に>
   - **確認依頼**: <手動確認してほしい事項を1行で簡潔に（特になければ「なし」）>
   ```


## 6. 作業のサイレント実行規約 (Silent Execution & Indicator)
- **着手時のインジケーター表示**: タスク着手時は必ず `.regista/templates/task-indicator.md` を読み込み、`{{TASK_OR_TICKET_NAME}}` を置換して1行のみを表示すること。ハードコードは禁止。
- **実況中継・コマンド発言の厳格禁止**: 「〇〇コマンドを実行します」「型チェック中...」等の途中経過やおしゃべりをチャットへ出力してはならない。ツール呼び出しにより裏で静かに実行を完遂すること。
- **差分出力の強制:** フルファイルの書き換えではなく、Unified Diffフォーマットでのパッチ提供を優先する。

## 7. 厳格なファイル生成制約と Type & Skeleton-First Driven Development (TSFDD)
- **生成サイズの制限 (Pre-tool hook):** 生成・置換しようとしている `Content` が 200行（コンポーネント）または 150行（フック）を超える場合、ツール実行を中断し、「責務ごとにファイルを分割して再生成する」ループを回すこと。
- **テンプレート・スケルトンの先行配置:** 新規作成・大規模分割時は、まず「型定義・インターフェース・空のスタブ」のみの骨組みを配置する。その状態で `rtk pnpm type-check:scoped` を実行し、型の安全性が確認されてからロジックやUIの詳細を個別に埋めていくこと。
- **事前宣言:** 3ファイル以上または合計200行を超える実装を行う場合、コード生成前に作成・修正予定の「ファイル一覧とそれぞれの責務（1行）」を箇条書きで宣言すること。
- **`write_to_file` での `ArtifactMetadata` 付与禁止 (MANDATORY):**
  - ワークスペース内（`src/`, `extension/`, `.regista/`, `AGENTS.md` 等）のファイルを新規作成する際は、`ArtifactMetadata` を**絶対に付与してはならない**。
  - `ArtifactMetadata` はシステムのアーティファクト専用ディレクトリ（`<appDataDir>/brain/<conversation-id>/`）配下のファイルにのみ許可される。ワークスペースパスに付与した場合、システムが `invalid artifact path` エラーでツール実行をブロックする。
  - ユーザー向けレポートや設計図など、**アーティファクトディレクトリに保存すべきドキュメントのみ** `ArtifactMetadata` を使用すること。

## 8. Pure Orchestration アーキテクチャ規約 (MANDATORY)

### ① GM Oracle Layer（GMの参照許可範囲の3階層定義）
GMが参照できるファイルは以下の3レイヤーで厳格に管理される。**レイヤー2は物理的アクセスを行わず、必ずScoutへ委譲すること。**

```
Layer 0 — 常時参照可能 (GMのコア知識):
  AGENTS.md, ORGANIZATION.md,
  .agents/knowledge/architecture-and-guidelines.md,
  .regista/contracts/*.json          ← Contract Registryのみ（型のサブセット）

Layer 1 — 必要時参照可能 (チケット・キャッシュ管理):
  .regista/tickets/*.md,
  .regista/scout-cache/*.json,       ← Scoutが生成したキャッシュ
  .regista/templates/*.md,
  .regista/metrics/quality-history.json

Layer 2 — 完全禁止 (コード本体・実装詳細):
  src/**,  extension/**
  *.ts, *.tsx, *.js, *.jsx (AGENTS.md, SKILL.md等のエージェント設定ファイルを除く)
```

**Layer 2へのアクセス違反はフック（`oracle-guard.js`）がログ警告を記録する。**

### ② Scout強制委譲（100% Explorer Delegation）
- コード変更タスクを受けたGMは、**例外なくScoutへ探索を委譲してからチケット発行を行う**こと。
- 局所タスク（3ファイル以内）であっても、GMは自身でコードを読まずにScoutへ委譲する（Adaptive Routingは廃止）。
- Scout起動前に必ず `.regista/scout-cache/` を確認し、有効なキャッシュ（gitハッシュ一致）があれば Scout起動をスキップしてキャッシュから取得する。
- 複数ドメイン横断タスクは **Parallel Scout Cluster** を使用し、ドメイン別に複数Scoutを並列起動して結果をマージする。

### ③ Scout Knowledge Cache プロトコル
- Scoutは探索完了後、結果を `.regista/scout-cache/{domain}-{git-hash}.json` として保存する（義務）。
- キャッシュの有効期限はgit hashで管理。コードが変更されたら自動的に無効化される。
- GMはチケット発行前に `rtk git rev-parse HEAD` でgit hashを取得し、キャッシュファイルの存在を確認してからScoutを起動するかどうか判断する。

### ④ Contract Registry（型インターフェースの仲介レイヤー）
- `.regista/contracts/*.json` にはドメイン間の公開型インターフェースのサブセットをJSON Schemaとして保持する。
- ScoutはコードベースのTypeScript型定義から公開インターフェースを抽出し、contractファイルを最新化する（チケット完了時の必須Write-back）。
- GMはWorker間のインターフェース整合性を、コードを読む代わりにこのcontractを参照して確認する。

### ⑤ Worker Escalation Protocol（自律エスカレーション）
実装中に想定外の状況が発生した場合、Workerは以下の3段階で自律対応する：

```
Level 1 (自律解決):   影響が担当チケットのファイル内に収まる → 自己判断で解決
Level 2 (Scout追加):  担当外ファイルへの副作用を発見      → Scoutに追加調査委譲してから継続
Level 3 (GM差し戻し): チケット前提が根本的に誤っている    → GMにチケット再分解を要求（実装停止）
```

Level 3エスカレーション時のWorkerからGMへの報告形式：
```json
{"escalation": 3, "ticket_id": "L1-UI-001", "reason": "前提の型変更が3つの追加ファイルに波及", "impacted_files": ["path/a", "path/b", "path/c"]}
```

### ⑥ Ticket Freshness Guard（チケット鮮度管理）
- 全チケットのYAMLフロントマターには `code_snapshot` フィールド（チケット発行時のgit hash）が必須。
- Workerは実装開始時に `rtk git rev-parse HEAD` で現在のgit hashを取得し、`code_snapshot` と照合する。
- 差異がある場合、Workerは自動的にScoutへ「差分チェック」を依頼してから実装を開始する（実装の前提が変わっていないか確認）。

### ⑦ Quality Ratchet（品質劣化自動検知）
- QAは採点結果を `.regista/metrics/quality-history.json` に蓄積する（Write-back義務）。
- 新チケットのQAスコア合計が「過去3チケットの平均合計 − 3点」を下回った場合、自動的に再実装フラグを立てる。
- GMは `pnpm tickets` 実行時に品質トレンドを確認し、劣化傾向がある場合はオーナーに報告する。

### ⑧ Compact Protocol（軽量通信の標準化）
- GM、Scout、Ticket-Writer間のやり取りは必要最小限のJSONまたはKey-Valueのみ。
- 挨拶・前置き・自然言語による長文説明を厳格に禁止する。
- Scoutへの指示には必ず `user_intent`（ユーザーの意図を2文以内で抜粋）を含めること。

### ⑨ Observability First（計測規範）
- アーキテクチャの大幅改修を行う際は、`.regista/metrics/` を用いて改修前後のベースラインを定量比較し、改善効果を実証すること。
