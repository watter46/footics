# Footics — エージェント行動指針

> Footics は **プレミアリーグ中心のフットボール戦術分析コンテンツ制作プラットフォーム**（個人用、Local-first）です。

## コア原則

1. **極限のトークン最適化** — 標準コマンド（`ls`, `cat`, `grep` 等）は `guard.ts` により自動最適化。探索初手は `repo_map.txt` (または `make map`) を参照し、`rtk` 系コマンドを使用すること
2. **高品質な実装の担保** — TDD 厳守、Biome v2 strict、TypeScript strict
3. **3層分離パイプライン** — Planner(Pro) → Worker(Flash) → Reviewer(Pro) によるタスク駆動開発
4. **推論の排除とスクリプト化** — `agent:check-worker` / `agent:check-reviewer` による自動検証

## 開発運用の基本フロー

- **起点**: すべての実装・変更は `tasks/TASK-*.md` を唯一の真実源（Single Source of Truth）として行います。
- **コミット手順**: コミット前は手探りせず `bun run agent:preflight` を実行し、合格後に `git add <paths> && git commit` で2手完了させます（ターン予算遵守。詳細は `notes/agent-ideal-trace.md`）。
- **ルール自動適用**: ディレクトリ・ファイル編集時に `.agents/rules/`（コーディング規約、テスト規約、データアクセス規約）が自動適用されます。ドキュメントを明示的に読みに行く必要はありません。
- **オンデマンド手順**: Dexie, Zustand, Konva 等の固有実装は `.agents/skills/` を必要時にロードして参照します。

## 行動制約 (Guardrails)

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
- `coding-standards.md` — `src/**`, `tests/**` アクセス時に自動適用
- `testing-standards.md` — `**/*.test.ts(x)`, `tests/**` アクセス時に自動適用
- `data-access.md` — `src/lib/db/**`, `src/stores/**` 等アクセス時に自動適用
- `agent-delegation.md` — サブエージェント委任時の完了回収・成果物契約を規定
