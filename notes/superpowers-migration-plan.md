# superpowers プラグイン移行 & 日本語化・Footics適合計画

本ドキュメントは、`.agents/plugins/superpowers` の廃止、有用スキルのプロジェクトネイティブ移行（`.agents/skills/` への集約）、日本語化、および Footics / Antigravity CLI 固有作法への完全適合に関する作業要件とネクストアクションをまとめた計画書です。

---

## 1. コア方針（決定事項）

1. **superpowers プラグインの廃止**:
   - 外部プラグイン `.agents/plugins/superpowers` は廃止・削除する。
2. **プロジェクトネイティブ化 & 完全日本語化**:
   - `.agents/skills/` 直下に配置・完全日本語化　AntigravityCLIの作法に違反しているものならAntigravityCLI用に変換する。
3. **進行管理の完全一本化（Ledger 不採用）**:
   - superpowers 由来の作業台帳（`progress.md`）や `docs/superpowers/` の配置構造は不採用とする。
   - `tasks/TASK-*.md` を唯一の真実源（Single Source of Truth）とする。
4. **Footics 固有ツールチェイン・規約への完全同期**:
   - パッケージマネージャ: `bun`（`npm` / `pnpm` を排除）
   - 静的解析・フォーマッタ: `Biome v2 strict`（生 ESLint/Prettier の排除）
   - コマンド最適化: `rtk` ラッパー厳守（生の `ls`, `cat`, `grep` 等の排除）トークン効率化をするルールやスキルを参照すること
   - 検証コマンド: スコープ付き検証（`bun run agent:check-worker`, `bun run agent:check-reviewer`）
   - ライフサイクル: Phase ごとの Worker 起動 ➔ **即時破棄（kill）** による直列リレー
   - 権限分離: Worker / Reviewer は Git 操作厳禁（コミットは全完了後に Planner のみ）

---

## 2. スキル選別・移行マトリクス

| 移行先スキル名（`.agents/skills/`） | 元スキル | 判定 | 移行・適合における主要変更点 |
| :--- | :--- | :---: | :--- |
| `test-driven-development` | `test-driven-development` | **移行** | 日本語化。`bun run agent:check-worker` による RED/GREEN 検証、Phase 内完結を明記。 |
| `verification-before-completion` | `verification-before-completion` | **移行** | 日本語化。「推測完了の禁止」と exit code 0 証拠提示の徹底。 |
| `systematic-debugging` | `systematic-debugging` | **移行** | 日本語化。当て推量修正の禁止、Worker の「3回連続失敗エスケープハッチ」と連携。 |
| `brainstorming` | `brainstorming` | **移行** | 日本語化。仕様書保存先を `docs/superpowers/` から Footics 形式へ整合。対話による要件合意ツール化。 |
| *(統合・調整)* | `writing-plans` | **調整** | `tasks/TASK-*.md` の正式フォーマットおよび Planner（Flash High）のプロトコルに完全準拠させる。 |
| *(廃止)* | `subagent-driven-development` | **削除** | Footics の独自リレー方式（`planner.md`）と真っ向から衝突するため廃止。 |
| *(廃止)* | `executing-plans` | **削除** | `worker.md` および `test-driven-development` に責務を一本化するため不要。 |
| *(廃止)* | `using-git-worktrees` | **削除** | Local-first 個人開発の Footics では環境競合・オーバーヘッドが大きく不採用。 |
| *(廃止)* | `finishing-a-development-branch` | **削除** | Footics の「プッシュ・マージは人間判断」規約と競合するため廃止。 |

---

## 3. High モデル切り替え後に実施するタスク一覧 (To-Do)

次回セッションにてモデルを **`Gemini 3.8 Flash (High)`** に切り替えた後、以下のステップで実装タスク（`tasks/TASK-*.md`）を作成し実行します。

### ステップ 1: スキル定義の精査と配置
- [x] `.agents/skills/` 直下に移行対象スキルを作成・配置
  - `test-driven-development/SKILL.md`
  - `verification-before-completion/SKILL.md`
  - `systematic-debugging/SKILL.md`
  - `brainstorming/SKILL.md`
  - `writing-plans/SKILL.md`
- [x] 各スキルの frontmatter（name, description）および本文を完全日本語化

### ステップ 2: Footics / Antigravity CLI ツールチェインへの適合
- [x] スキル内のコマンド例をすべて `bun` / `rtk` / `agent:check-*` に置換
- [x] `docs/superpowers/` や `.superpowers/sdd/` への参照を完全除去
- [x] 既存エージェント層（`.agents/agents/planner.md`, `worker.md`, `reviewer.md`）の参照先スキルのパスを更新

### ステップ 3: superpowers プラグインの安全な撤去
- [x] `.agents/plugins/superpowers/` ディレクトリを削除
- [x] `.agents/` 内の hooks や設定ファイル（`context.json`, `hooks.json` 等）に残存参照がないか `rtk grep` で確認・クリーンアップ

### ステップ 4: docs との乖離解消 (ドキュメント同期)
- [x] `docs/philosophy.md` を最新仕様に更新
  - superpowers「無改変維持」の記述を、プラグイン廃止および `.agents/skills/` へのプロジェクトネイティブ集約方針に更新
  - ガードレール設定ファイルのパスを `.agents/hooks/guard.js` から `.agents/hooks/guard.ts` に修正
  - 3層パイプライン図の Planner のモデル表記を `Pro` から `Flash High` に同期

### ステップ 5: 整合性検証 (Preflight)
- [x] `bun test ./.agents` および関連テストがパスすることを確認
- [x] 各種スキルが Antigravity CLI のスキル仕様に適合していることを確認

