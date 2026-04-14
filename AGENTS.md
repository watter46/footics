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

## 参照先
- **行動規範:** `.agent/rules/` を参照してください。
- **ワークフロー:** `.agent/workflows/` を参照してください。
