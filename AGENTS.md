---
trigger: always_on
---

# エージェント行動指針 (MANDATORY)

このプロジェクトを操作するエージェント（Antigravity）は、以下のルールを **必ず読み込み、例外なく最優先で遵守すること**。

## 1. エージェント行動規範 (Senior Engineer Conduct)
- **Chain of Thought (CoT) Enforcement**: 浅い思考によるバグを排除し、深く考えてから行動する。複雑な修正やデバッグの際はいきなりコードを修正せず、思考プロセスを出力し、依存関係、副作用、代替案を検討する。
- **Context Awareness & Cleanup**: 作業のために作成した一時ファイルや一時的なルールは、タスク完了時に必ず削除する。
- **Self-Correction**: エラーが発生した場合、自律的に原因を分析し、修正を試みる。
- **Knowledge Maintenance**: タスク着手前に必ず `.agents/knowledge/` の関連KIを確認し、推測による実装を防ぐ。タスク完了後、自律的に `/knowledge-update` ワークフローを実行し KI を更新する。

## 2. プロジェクト構造とコード共有ルール (Architecture)
本プロジェクトは `pnpm workspaces` を用いたモノレポ構成を採用しています。各パッケージの詳細ルールはそれぞれの `AGENTS.md` を参照してください。
- **パッケージ構成:**
    - `src/`: メインの Web アプリケーション (Next.js)
    - `extension/`: ショートカットキー操作特化拡張機能 (WXT)
    - `video-canvas/`: 映像スクリーンショット 描画特化拡張機能 (WXT + tldraw)
- **コード共有ルール:** パッケージ間での型定義やユーティリティの共通化を推奨する。パッケージ間の循環参照、および `src/` への無許可の直接インポートを禁止する。

## 3. 言語戦略 (Language Strategies)
- **内部推論 (Internal Reasoning):** 英語を許可。
- **コード (Code):** 標準的な英語を使用（変数名、コメント等）。
- **ユーザー向け出力 (User-Facing):** **日本語**を必須とする。

## 4. プロジェクト構造認識 (Project Structure Awareness)
- **Index Before Act**: タスク開始前に必ずプロジェクト構造を把握する。`indexing-awareness` スキルを活用する。
- **Grep, Don't Guess**: 存在しない関数、型、モジュールを捏造しない。確証がなければ `grep` または `trace-dependencies.sh` で実在確認する。
- **Verify After Change**: ファイル操作後は `grep` で古い参照が残っていないか確認する。

## 5. トークン効率と実行スコープの最適化
- **RTK の活用**: 全てのシェルコマンド実行には `rtk` ラッパーを介す。500行を超えるファイルには `rtk smart` を使用する。
- **ターゲット指向の検索**: 検索（grep）や構造把握（ls）を行う際は、プロジェクトルートではなく、必ず**関連する最小単位のディレクトリ**を対象にすること。

## 6. CLI環境およびデプロイ・ビルド運用プロトコル
- **Auto-Deploy on Push (Web App):** `src/` 配下の変更を `git push` した後は、自動でデプロイ処理（`pnpm run deploy`）を実行すること。
- **Auto-Build & Sync (Extension / Video-Canvas):** `extension/` または `video-canvas/` 配下を変更した後は、該当パッケージ内で `pnpm run build`（ビルドおよび Windows 側への `sync-extension`）を実行すること。
- **CLI Output Optimization:** Mermaid 図などの視覚的ダイヤグラムを出力しない。結論ファーストでプレーンテキスト、箇条書き、シンプルなテキストコードブロックのみで記述する。
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
