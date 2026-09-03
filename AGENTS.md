---
trigger: always_on
---

# エージェント行動指針 (MANDATORY)

このプロジェクトを操作するエージェント（Antigravity）は、以下のルールを **必ず読み込み、例外なく最優先で遵守すること**。

## 0. 開発組織「Regista」と実行モード (Execution Modes)
本プロジェクトは自律型AIエンジニア組織「Regista」規約に基づいて運用されますが、**トークン浪費を防ぎ迅速に成果を出すため、タスク規模に応じた2つの実行モードを厳格に使い分けます**。
- **Fast-Track Mode (軽量・単独実行モード - 原則こちらをデフォルト適用):**
  - **対象:** 日常の質問、技術相談・調査、1〜3ファイル以内の機能追加・修正・バグ修正、型エラー解消、軽微なリファクタリング。
  - **挙動:** GMによるチケット発行・AAWU分解・独立QAサブエージェント召喚等の重厚な往復フローを**完全にバイパス**し、現在のエージェント単独で即時実装・最小スコープ検証（変更ファイルに対する lint / type-check / 対象テスト）を行って完了する。
  - **肥大化防止ガードレール (STOP & PROPOSE):** Fast-Track実行中であっても、修正によって対象ファイルが **300行** を超過する見込みの場合、または1ファイルに「UI描画」と「複雑な状態管理・副作用」が混在する場合は、**即座に実装を停止**すること。独自にコードを書き進めず、ユーザーに対して「カスタムフック等への即時分割」または「Orchestratedモードへの昇格（チケット発行）」を提案せよ。
- **Orchestrated Mode (組織的開発モード):**
  - **対象:** 複数ドメイン（Web + Extension + Canvas + Data等）に跨る大型新機能開発、DB破壊的マイグレーション、アーキテクチャ刷新。
  - **挙動:** [ORGANIZATION.md](./ORGANIZATION.md) に定義された State Machine (TRIAGE → DESIGN → IMPLEMENTATION → REVIEW_QA → DONE) に従って分業する。
  - **GMタスク分解・チケット発行 (DAG & Markdown Tickets):** GM (`regista-gm`) は要件受領時にタスクを極小AAWU（1〜3ファイル単位）へ分解し、並列実行可能なDAG構造として `.regista/tickets/[ID].md` にチケットを発行する。
- **チケット出力・運用プロトコル (DAG & Markdown Distribution Standard):**
  - **1. 分散Markdownファイル管理 (`.regista/tickets/[ID].md`):**
    - 単一JSONファイルによる管理を廃止し、「1チケット = 1Markdownファイル」の分散管理を行う。
    - 各チケットは `.regista/templates/task-ticket.md` テンプレートを参照して `.regista/tickets/[ID].md` として作成され、YAMLフロントマター（`id`, `title`, `status`, `depends_on`, `model`, `effort`, `context_files`）と本文（UX Impact, Detailed Spec, Acceptance Criteria & Verification Commands）を持つ。
  - **2. Layer-Based DAG ID体系:**
    - フォーマット: `L{深度}-{ドメイン名}-{連番3桁}`
    - `L1`: 他のチケットに依存せず即時並列実行可能。`L2`: L1完了に依存。`L3`: L2完了に依存... と続く。
    - CLIからの進捗・依存確認には `pnpm tickets` を使用する。
  - **3. モデルとEffortの選定 (ホワイトリスト):**
    - 高速・軽量タスク用: `Gemini 3.8 Flash` [low/medium/high] (基本), `Gemini 3.7 Flash`, `Gemini 3.6 Flash`
    - 複雑なアーキテクチャ・難解バグ用: `Gemini 3.1 Pro` [low/high], `Claude Sonnet 4.6` (thinking), `Claude Opus 4.6` (thinking)
    - 独自処理用: `GPT-oss 120B` (Medium)
  - **4. 会話分離の原則 (Cross-Conversation Execution Isolation):**
    - チケット一覧の展開・企画・チケット発行は「企画/GM Conversation」で行う。
    - **各チケット（AAWU）の実際の実装・テスト・検証は、必ず「別（新規）のConversation」を作成して実施する**（コンテキスト汚染とトークン浪費の防止）。
    - Workerエージェントは `context_files` に指定されたファイルのみをコンテキストに読み込み、効率的に実装する。
  - **5. チャットへの厳格なチケット一覧表出力 (`.regista/templates/board-summary.md` 準拠):**
    - チケット発行時および進捗確認時、GMはCLIのチャット上に `.regista/templates/board-summary.md` に準拠したMarkdownテーブル（未完了の残存チケット一覧）を1つだけ出力する（「レイヤー」列および「チケットファイル」列は含めず、余計な解説は不要）。
    - 各行のTicket IDには、レイヤー深度ごとに必ず異なる色のサークル絵文字（同一レイヤーには同色、異なるレイヤーには直前のレイヤーと異なる色）を付与する。
      - `🟢 L1` (即時並列可能)
      - `🟡 L2` (L1完了待ち)
      - `🟠 L3` (L2完了待ち)
      - `🔴 L4` (L3完了待ち)
      - `🟣 L5` (L4完了待ち)
      - `🔵 L6` (L5完了待ち)
      - `🟤 L7` (L6完了待ち)
      - `⚫ L8` (L7完了待ち)
      - `⚪ L9+` (深層ブロック)
  - **6. チケット実装完了時の超凝縮チャット報告フォーマット (`.regista/templates/completion-report.md` 準拠):**
    - タスク実装完了時、Workerは `.regista/templates/completion-report.md` に準拠した「YAML（機械可読）＋ 超凝縮Markdown（人間向け）」形式でチャット出力する。
    - 冗長なコード解説や思考プロセスの出力を【原則禁止】とし、ユーザー目線での挙動変化（1〜2行）と変更ファイル、検証結果のみを出力して確認待ち状態に移行すること。
    - **ユーザー完了合図の絶対厳守**: エージェントは報告後、**ユーザーから「完了」「OK」等の明示的な合図を受けるまで、勝手にチケットステータスを DONE に更新したり git commit を実行してはならない**。合図受領後、チケットファイルの `status: DONE` 更新とコミットを行う。
    - **完了報告テンプレート (厳格遵守):**
      ````markdown
      ```yaml
      ticket_id: "{Ticket ID}"
      status: "COMPLETED"
      files_changed:
        - "{変更ファイル1}"
      verification:
        biome: PASS
        type_check: PASS
        vitest: PASS
        vitest_count: 0
      ```

      ## ✅ 完了報告: {Ticket ID} ({タスク名})

      - **挙動の変化**:
        - {画面や機能の動作として何が変わったかを1〜2行で簡潔に記載}
        - {操作や見た目の変化点}
      - **変更ファイル**: `{主要な変更ファイル名をカンマ区切り}`
      - **検証**: Biome: `{PASS/FAIL}` | TypeCheck: `{PASS/FAIL}` | Vitest: `{PASS (件数) / SKIP / FAIL}`

      > 問題なければ「**OK**」または「**完了**」と入力してください（チケットのステータス更新・コミットを実行します）。
      ````

## 1. エージェント行動規範 (Senior Engineer Conduct)
- **Chain of Thought (CoT) Enforcement**: 浅い思考によるバグを排除し、深く考えてから行動する。複雑な修正やデバッグの際はいきなりコードを修正せず、思考プロセスを出力し、依存関係、副作用、代替案を検討する。
- **Context Awareness & Cleanup**: 作業のために作成した一時ファイルや一時的なルールは、タスク完了時に必ず削除する。
- **Self-Correction**: エラーが発生した場合、自律的に原因を分析し、修正を試みる。
- **Knowledge Maintenance**: タスク着手前にタスクに直接関係する `.agents/knowledge/` のKIのみを確認し、推測による実装を防ぐ。タスク完了後、自律的に `/knowledge-update` ワークフローを実行し KI を更新する。

## 2. プロジェクト構造とコード共有ルール (Architecture)
本プロジェクトは `pnpm workspaces` を用いたモノレポ構成を採用しています。各パッケージの詳細ルールはそれぞれの `AGENTS.md` を参照してください。
- **パッケージ構成:**
    - `src/`: メインの Web アプリケーション (Next.js)
    - `extension/`: 統合ブラウザ拡張機能 (WXT: ショートカットメモ + DRM動画キャプチャ)
- **コード共有ルール:** パッケージ間での型定義やユーティリティの共通化を推奨する。パッケージ間の循環参照、および `src/` への無許可の直接インポートを禁止する。

## 3. 言語戦略 (Language Strategies)
- **内部推論 (Internal Reasoning):** 英語を許可。
- **コード (Code):** 標準的な英語を使用（変数名、コメント等）。
- **ユーザー向け出力 (User-Facing):** **日本語**を必須とする。

## 4. プロジェクト構造認識 (Project Structure Awareness)
- **Index Before Act**: タスク開始前に必ずプロジェクト構造を把握する。`indexing-awareness` スキルを活用する。
- **Grep, Don't Guess**: 存在しない関数、型、モジュールを捏造しない。確証がなければ `grep` または `trace-dependencies.sh` で実在確認する。
- **Verify After Change**: ファイル操作後は `grep` で古い参照が残っていないか確認する。

## 5. トークン効率とコンテキストエンジニアリング (Token Efficiency Guardrails)
- **RTK の完全適用**: 全てのシェルコマンド実行には必ず `rtk` ラッパーを介す（例: `rtk vitest run ...`, `rtk biome check`）。
- **ターゲット指向の検索 & 参照**: 検索（grep）や構造把握（ls/find）を行う際は、プロジェクトルート全体ではなく必ず**関連する最小単位のディレクトリ**を対象にする。`find_by_name` は必ず `MaxDepth` を指定する。
- **巨大ファイルのピンポイント読み込み**: 300行を超えるファイルに対して無差別な全読み込みを行わない。`grep_search` や `view_file` の `StartLine`/`EndLine` を活用して必要な箇所のみをピンポイントで取得する。
- **スコープ限定テスト・高速型検証の徹底 (Targeted Verification)**:
  - **型チェック (Type Check):**
    - ❌ **禁止:** `tsc --noEmit`, `pnpm type-check` (プロジェクト全体の無差別実行は厳禁)
    - ⭕ **必須:** `pnpm type-check:scoped <変更ファイル>` または `pnpm verify:scoped <変更ファイル>`
  - **テスト (Vitest):**
    - ❌ **禁止:** `vitest run`, `pnpm test` (プロジェクト全体の無差別実行は厳禁)
    - ⭕ **必須:** `rtk vitest run <影響パス/対象テストファイル>`
  - **Lint / Format (Biome):**
    - ⭕ **必須:** `rtk biome check <対象ディレクトリ>`

## 6. CLI環境およびデプロイ・ビルド運用プロトコル
- **Auto-Deploy on Push (Web App):** `src/` 配下の変更を `git push` した後は、自動でデプロイ処理（`pnpm run deploy`）を実行すること。
- **Auto-Build & Sync (Extension):** `extension/` 配下を変更した後は、該当パッケージ内で `pnpm run build`（ビルドおよび Windows 側への `sync-extension`）を実行すること。
- **CLI Output Optimization:** Mermaid 図などの視覚的ダイヤグラムを出力しない。チケット実装完了時は冗長なコード解説・内部実装・思考プロセスの出力を原則禁止とし、超凝縮完了報告フォーマットのみを出力してユーザー確認待ちに移行する。
- **CLI Log & Task Notification:** コマンド実行の大量ログは上位エラー原因のみ要約して報告し、ワンラインステータス通知（例: `[STATUS] Build completed`）を徹底する。

## 7. Core Tech Stack (コア技術スタック)
- **原則:** Web本体および拡張機能を含む全プロジェクトで一貫したモダンな技術スタックを維持する。
- **標準技術:** React 19 / TypeScript (Strict Mode) / Tailwind CSS v4 / Zustand / Zod / Dexie.js / Lucide React

## 8. Design & Architecture (設計とアーキテクチャ)
- **原則:** 関心事の分離、単一責任、継承より合成（Composition over Inheritance）を重視する。
- **行動指針:**
    - ロジック（Custom Hooks）、状態解決（Zustand）、UI描画（React/Tailwind）を明確に分ける。
    - コンポーネントは一つの役割のみを持つように極力小さく保つ。

## 9. Naming Conventions & Code Style (命名規則とコードスタイル)
- **原則:** 一貫した命名とスタイルで予測可能なコード構造を保つ。
- **行動指針:**
    - ファイル名は原則ケバブケース (`user-profile.tsx`) を使用。Reactコンポーネントは `.tsx`、それ以外は `.ts`。
    - エクスポートは名前付きエクスポート (Named exports) を優先。
    - インデントは2スペース、シングルクォートを使用する。
    - ディレクトリのサブディレクトリ化: フォルダ内にファイルが 5〜7 個以上並び始めたら適切に分割する。

## 10. TypeScript, Zod & Testing (型安全と品質)
- **原則:** 厳格な型定義と自動テストで信頼性を担保する。
- **行動指針:**
    - `strict: true` を前提とし `any` 型を禁止。外部データは Zod スキーマで検証し `z.infer` で型を導出する。
    - 複雑なロジックを伴う Custom Hooks や Utility 関数には Vitest によるユニットテストを作成する。
    - **テスト・検証のスコープ限定**: テスト実行時は `rtk vitest run <影響対象パス>`、型チェック時は `pnpm type-check:scoped <変更ファイル>`（全体 `tsc --noEmit` は禁止）を用い、変更影響のある範囲のみを迅速に検証する。

## 11. Responsibility Segregation (責務の分離)
- **原則:** 単一ファイルへの知識集中を防ぐ (Single Responsibility Principle)。
- **行動指針:**
    - UI表示と副作用（Manager/Listener）を分離する。
    - コンポーネントの行数は原則 200〜300 行を上限とし、超える場合は Custom Hook やサブコンポーネントに分割する。
    - 定数・ID は `constants.ts` 等に切り出しマジックストリングを排除する。

## 12. Don't Reinvent the Wheel (車輪の再発明の禁止)
- **原則:** 標準ライブラリ（Zustand, Zod, Dexie.js, tailwind-merge 等）を活用し自前実装を避ける。
- **行動指針:**
    - ネイティブAPIの独自ラッパーや過剰な自己管理を禁じる。常に既存エコシステムで解決できないか検討する。

## 13. Immutable Refactoring Principles (不変のリファクタリング原則)
- **原則:** 振る舞いを変えずにコードの品質を安全に向上させる。
- **行動指針:**
    - テスト必須: テストがない状態でのリファクタリングは禁止。
    - インクリメンタル: 一度に一つの変更のみ行い、機能追加と同時に行わない。
    - 理解優先: 意図と副作用を完全に理解してから着手し、不明解な場合は "/ask" で相談する。

## 14. UI/UX Design Standards (UI/UXデザイン標準)
- **原則:** ユーザーを一目で「感動」させる、高品質で洗練されたデザインを維持する。
- **行動指針:**
    - 深みのあるモダンな配色、洗練されたダークモード、明確なタイポグラフィを採用する。
    - スムーズなトランジション、マイクロアニメーション、グラスモーフィズム等を活用しプレミアムな外観を表現する。

## 15. Performance-First Guardrails (パフォーマンスファースト原則とアンチパターン禁止)
- **原則:** 「ただ動く」だけのナイーブな実装を禁止し、常に 60fps〜120fps の滑らかな操作性と低メモリ負荷を保証する。
- **禁止アンチパターン (即座に REJECT 対象):**
    - **過渡状態の React State 更新禁止:** ドラッグ中・マウス追従中・描画インタラクション中（`onDragMove`, `onMouseMove` 等）に `setState` や Zustand ストア更新を呼んではならない。過渡状態は Ref や Canvas/Konva ノード直接操作で処理し、完了時（`onDragEnd`, `onMouseUp`）にのみストアへ同期する。
    - **Zustand 丸ごと購読禁止:** `useStore()` や `useTacticalStore()` のような全プロパティ購読を禁止する。必ず細粒度セレクター (`useStore(s => s.foo)`) を使用する。
    - **Canvas レイヤー混在禁止:** 静的背景（ピッチ線、グリッド等）と頻繁に動く要素（マーカー、矢印、選択枠等）を同一 Layer に配置してはならない。必ず独立した `<Layer listening={false}>` 等に分離する。
    - **ドラッグ要素への CSS Transition / Blur 付与禁止:** ドラッグ中の要素（`DragOverlay` やマーカー）に `transition-all` や `filter: blur()` を付与してはならない。必ず `willChange: 'transform'` および `transition: none` を適用する。
    - **ホットパス・ループ内でのオブジェクト再生成禁止:** アニメーションループ、描画ハンドラ、検索サジェスト関数内で `new Fuse()`, `new OffscreenCanvas()`, 大量オブジェクト生成を行ってはならない（キャッシュまたは事前生成する）。
    - **頻出子コンポーネントの memo 化省略禁止:** ピッチ上マーカーやリストアイテムなど、大量または頻繁に再描画トリガーがかかるコンポーネントには `React.memo` を適用する。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 16. Phase 3.5 ループエンジニアリング (Loop Engineering Guardrails)
- **原則:** 自律型開発ループのトークン浪費を防ぎ、最速で収束させる。
- **Executor (実装者) の行動指針:**
    - **Level 1の自己完結:** 実装直後は、QAに依頼する前に必ず自身で影響範囲の局所検証 (`Biome`, `type-check:scoped`, `vitest --related`) を行い、エラーを自己解決する。
    - **差分出力の強制:** フルファイルの書き換えではなく、Unified Diffフォーマットでのパッチ提供を優先する。
- **Architect (進行管理) の行動指針:**
    - **コンテキストの動的圧縮 (Slicing):** ループ再試行時は過去の全対話履歴を破棄し、「現在のDiff」と「直近のエラーJSON (`EvaluatorFeedback`)」のみを抽出して次ループに渡す。
- **Skill資産化 (Tool-Maker):**
    - 3回以上反復されたコンポーネント実装・ボイラープレート・環境構築手順は、自律的に `~/.gemini/config/skills/` または `.agents/skills/` 配下にSkillスクリプトとして抽出・登録すること。
