# Footics — エージェント行動指針

> Footics は **プレミアリーグ中心のフットボール戦術分析コンテンツ制作プラットフォーム**（個人用、Local-first）です。

## コア原則

1. **極限のトークン最適化と直接探索** — 標準コマンド（`ls`, `cat`, `grep` 等）は `guard.ts` により自動最適化。探索は `repo_summary.txt`、`bun run ai:find <symbol>`、`rg -l '<symbol>' src/ extension/`（Consumer 全件特定）、`bun run ai:outline <files...>`（行番号・内部import・折りたたみシグネチャ抽出）、および `read_file`（400行以下は1回で全文、400行超は行範囲指定）で Planner 自らが直接行う（旧 `Scout` は廃止）。
2. **高品質な実装とモックテスト排除** — Biome v2 strict、TypeScript strict、および内部 Store / Hook の `vi.mock` を禁止した「純粋関数 I/O テスト ＋ 実 `StoreProvider` 結合テスト」により、`bun dev` でのブラウザ実行時エラーを根絶する。
3. **2階層モデル（Planner + Worker）と並列パイプライン** — 旧 `Scout` / `Reviewer` を廃止し、`Planner (pro)` と `Worker (flash / flash_lite)` の2階層に純化する。Planner / Brainstormer は要望に破綻や副作用がある場合、迎合せず『⚠️ 設計破綻・副作用の指摘』として反論・代替案を提示する。1〜4ファイルの変更は 1 Phase（1 Worker）で一括完遂し、5ファイル以上は 1 Phase 最大6ファイル（プロダクション4＋テスト2、`[DELETE]` はカウント対象外）以下に分割、非重複 Phase は並列 Worker 起動で高速化する。
4. **Worker 推論ゼロの局所タスク契約と2段階検証ゲート** — タスクファイル（`tasks/TASK-*.md`）は **「タスクファイル ＞ フェーズ（1 Worker単位） ＞ タスク」** の階層とし、事前コミットメッセージ（`Commit:`）、残存禁止条件（Negative Contracts）、およびファイルごとの局所契約（`[ADD]` / `[MODIFY: Before ➔ After]` / `[DELETE]`）を完全コードで記述する。**ファイル全体のコピペ（import〜末尾）は厳禁**とし、変更箇所の関数・TSXブロック（前後2〜3行アンカー付き、10〜40行程度、120行以内）に局所化してタスクファイル全体を **300〜500 行（最大 800行）** に収める。古い仕組みや既存テストを温存する一時的フォールバック（二重持ち）は全面禁止とする。各 Phase の Worker は担当ファイル限定の `bun run ai:check <files>` を実行し、全 Phase 完了後に Planner が全体統合検証（`bun run ai:preflight` / `bun run ai:commit`）を一括実行する。
5. **4層コンポーネントモデルとホスト境界の厳守** — Web と Extension で共用するコードは Level 2（Domain UI Block）以下に配置し、`chrome.*` や Web専用ストア等のホスト依存を絶対に混入させないこと。Store Provider パターンにより初期チラつき（Flicker）を根絶すること。
6. **レジストリ・パッケージ型拡張設計（OCP 厳守）** — ツールや機能追加でコアコンポーネント（Stage, Toolbar, DashboardView, Background Commands等）に巨大な `switch / if` をベタ書きすることを禁止し、レジストリ登録または自律的なモジュール分離で拡張すること。
7. **平易な対話（`caveman` + ユビキタス言語）と2項目完了サマリー** — ユーザー対話および Plan Artifact は結論最優先・前置き排除（`caveman`）を徹底し、抽象的なシステム用語ではなく Footics の画面・機能用語（ユビキタス言語）を使用する。実装完了報告は「① 変更された内容（ユーザー目線の変化）」「② 手動・目視での確認手順（画面・操作・期待結果）」の2項目のみで端的に出力すること。

## 開発運用の基本フロー

- **起点**: すべての実装・変更は `tasks/TASK-*.md` を唯一の真実源（Single Source of Truth）として行います。
- **タスク作成時検証**: タスクファイル作成・更新時は `bun run task:validate <tasks/TASK-XXX.md>` を実行し、省略記号やフォーマット不備がないことを確認します。
- **Phase 実装中検証（Worker）**: 各 Phase の Worker は実装とテストを同時に作成し、`bun run ai:check <担当ファイル群>` で Guardrails・Biome・担当テストを検証します（旧 `ai:check:red` は廃止）。
- **最終統合検証・コミット（Planner）**: 全 Phase 完了後、Planner が `GIT_EXTERNAL_DIFF=difft rtk git diff` で差分を確認した上で、`bun run ai:commit -m "<msg>" [paths]`（またはタスクファイル内の `Commit:` メッセージ自動適用）を実行します。内部で `task:validate`・全体 `tsc`・関連 `vitest`・`depcruise`・`[DELETE]` ファイル削除確認が一括実行されます（生 `git commit` は禁止）。

## 行動制約 (Guardrails)

- **スコープ原則の厳守**: Worker は担当ファイルのみを `bun run ai:check <files>` で検証し、全体検証は全 Phase 完了後の `bun run ai:preflight` / `bun run ai:commit` で行うこと。
- **ライブラリ無断追加の禁止**: `package.json` への新規依存追加はユーザーの明示的承認を得ること。
- **未決定事項（Open Decisions）の勝手な実装禁止**: 仕様が未定の領域は推測で実装せず、ユーザーへ確認すること。
- **DB スキーマ変更時のマイグレーション必須**: `src/lib/db/schema.ts` のバージョンアップと `.upgrade()` ブロックの記述が必須。
- **`biome-ignore` の新規追加は原則禁止**。
- **ターン数の肥大化防止**: 独立した読み込みは並列ツールコールで実行し、コマンドは `&&` で連結すること。

## 設計思想・詳細仕様（リファレンス）

- 設計思想・仕様リファレンス（辞書）: `docs/README.md`（必要時のみ参照）

## 詳細規約

スコープ付きルールが `.agents/rules/` に配置済み：
- `efficient-exploration.md` — ディレクトリ走査・ファイル探索時に常時適用（トークン最適化プロトコル）
- `tactical-domain-architecture.md` — `src/features/tactical-unified/**`, `src/lib/tactical/**`, `src/lib/types/tactical/**` アクセス時に自動適用（戦術ボード専任・関数型DDD・6コンテキスト・決定論的パイプライン規約）
- `component-architecture.md` — `src/**`, `extension/**` アクセス時に自動適用（4層モデル・Store Provider・副作用ゼロ）
- `coding-standards.md` — `src/**`, `extension/**`, `tests/**` アクセス時に自動適用
- `react-nextjs.md` — `src/**`, `extension/**` アクセス時に自動適用（React 19・Compiler・`useEffect` 規律・Next.js 16 境界）
- `testing-standards.md` — `**/*.test.ts(x)`, `tests/**` アクセス時に自動適用
- `data-access.md` — `src/lib/db/**`, `src/stores/**` 等アクセス時に自動適用（Dexie / TanStack Query / Zustand 3層モデル）
- `agent-delegation.md` — 2階層（Planner + Worker）委任時の完了回収・成果物契約を規定
- `plan-artifact.md` — 設計計画立案時（`/plan`, `tasks/**`, `.agents/**`）の日本語 Artifact 構成規約（ユビキタス言語・コード/ファイルパス排除）


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
