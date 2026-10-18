# Footics — エージェント行動指針

> Footics は **プレミアリーグ中心のフットボール戦術分析コンテンツ制作プラットフォーム**（個人用、Local-first）です。

## コア原則

1. **極限のトークン最適化** — 標準コマンド（`ls`, `cat`, `grep` 等）は `guard.ts` により自動最適化。探索初手は `repo_summary.txt`（高レベル把握）を参照し、シンボル特定は `bun run ai:find <symbol>` を使用すること
2. **高品質な実装の担保** — TDD 厳守、Biome v2 strict、TypeScript strict
3. **4層分離パイプライン** — Scout(Flash Lite/Flash) → Planner(Flash High) → Worker(タスク難易度に応じて Flash / Flash-Lite を切り替え) → Reviewer(Flash High) によるタスク駆動開発
4. **推論の排除とスクリプト化** — `ai:check` / `ai:reviewer:check` による自動検証
5. **4層コンポーネントモデルとホスト境界の厳守** — Web と Extension で共用するコードは Level 2（Domain UI Block）以下に配置し、`chrome.*` や Web専用ストア等のホスト依存を絶対に混入させないこと。Store Provider パターンにより初期チラつき（Flicker）を根絶すること。
6. **プラグイン型拡張設計（OCP 厳守）** — ツールや機能追加でコアコンポーネント（Stage, Toolbar, DashboardView等）に `switch / if` をベタ書きすることを禁止し、自律的なプラグインと自己申告型オプション（`OptionsComponent`）で拡張すること。

## 開発運用の基本フロー

- **起点**: すべての実装・変更は `tasks/TASK-*.md` を唯一の真実源（Single Source of Truth）として行います。
- **初動探索・現状確認**: 初手は `rtk read .agents/.cache/repo_summary.txt` で全体像を把握。現状の検証確認は差分スコープ（`bun run ai:check [path]`）を使用し、差分0の状態で `ai:preflight` を叩かないこと。
- **コミット手順**: コミット時は手動コミットを行わず、`bun run ai:commit -m "<msg>" [paths]` を実行します。Preflight並列検証・合格ファイルの自動ステージング・コミットが1手で完結します（生 `git commit` は禁止。詳細は `notes/agent-ideal-trace.md`）。
- **ルール自動適用**: ディレクトリ・ファイル編集時に `.agents/rules/`（コーディング規約、テスト規約、データアクセス規約、コンポーネント規約）が自動適用されます。ドキュメントを明示的に読みに行く必要はありません。
- **オンデマンド手順**: Dexie, Zustand, Konva 等の固有実装は `.agents/skills/` を必要時にロードして参照します。

## 行動制約 (Guardrails)

- **スコープ原則の厳守（全体用コマンドの無断実行禁止）**: 検証は常に差分スコープ付き（対象ファイル指定、または差分自動検知の `bun run ai:check [files]`）で実行すること。無断の全体検査は禁止。
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
- `component-architecture.md` — `src/**`, `extension/**` アクセス時に自動適用（4層モデル・プラグイン設計・副作用ゼロ）
- `coding-standards.md` — `src/**`, `extension/**`, `tests/**` アクセス時に自動適用
- `testing-standards.md` — `**/*.test.ts(x)`, `tests/**` アクセス時に自動適用
- `data-access.md` — `src/lib/db/**`, `src/stores/**` 等アクセス時に自動適用
- `agent-delegation.md` — サブエージェント委任時の完了回収・成果物契約を規定

