## Project Guidelines (SSoT)

## 1. Monorepo Architecture (モノレポ構成)
本プロジェクトは `pnpm workspaces` を用いたモノレポ構成を採用しています。

- **パッケージ構成:**
    - `src/`: メインの Web アプリケーション (Next.js)。詳細は [src/AGENT.md] を参照。
    - `extension/`: メイン機能のショートカットキー操作特化拡張機能 (WXT)。詳細は [extension/AGENT.md] を参照。
    - `video-canvas/`: 映像スクリーンショット 描画特化拡張機能 (WXT + tldraw)。詳細は [video-canvas/AGENT.md] を参照。

## 2. コード共有と詳細ルール
各プロジェクトの具体的な技術スタック、ドメイン知識、およびコーディング規約については、上記それぞれの `AGENT.md` を **必ず読み込み、個別の真実として扱うこと**。

- **型定義 / ユーティリティ:** パッケージ間での共通化を推奨する。
- **禁止事項:**
    - パッケージ間での循環参照。
    - `extension` や `video-canvas` から `src/` (Next.js) への無許可の直接インポート。

## 3. Agentic Harness Protocol (エージェント検証ハーネス規約)
このプロジェクトにおいて Agent (Antigravity 等) は、実装フェーズにおいて以下の「ハーネス（手綱）」を必ず握った状態で動作しなければなりません。

### 動作サイクル: Verification Loop
あらゆる実装タスクにおいて、Agent は以下のループを自律的に実行してください。
1. **[Plan]**: `/plan` ワークフローを用いて `task.md` を作成する。
2. **[Implement]**: `task.md` のステップに従い、最小単位でコードを修正する。
3. **[Verify]**: **修正直後（報告前）に、必ず以下のコマンドをルートで実行し、品質を保証する。**
   - `pnpm verify`: 整形・解析・型チェック (`tsc`) の一括実行。
4. **[Self-Correct]**: 検証でエラーが出た場合、ユーザーに報告する前に自ら修正を試みる。

### Biome 一本化ルール (Evaluator Harness)
本プロジェクトは Biome を唯一の Linter/Formatter として採用しています。
- **インポートの整理**: Agent は手動でインポートを整理する必要はありません。`pnpm check` が自動で行います。
- **スタイルの固定**: インデント、クォート、末尾コンマ等は Biome 設定に準じます。

### 故障時のプロトコル (Safety Harness)
- 検証エラーが 3 回連続で解消できない場合は、速やかに **Pro/Thinking モデルに交代** するか、ユーザーに相談（`/ask`）し、計画 (`/plan`) を見直してください。

## 参照先
- **行動規範:** `./AGENTS.md` (Harness Protocol) および `.agent/rules/` を参照してください。
- **ワークフロー:** `.agent/workflows/` を参照してください。
