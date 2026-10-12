# 技術スタック・ディレクトリ規約 (Tech Stack & Directory Conventions)

> **【エージェントへの指示】**
> 実装を開始する前に必ずこのドキュメントを参照し、ライブラリ選定・ファイル配置・命名規則・importパスの規約に従うこと。
> このドキュメントに記載のない新しいライブラリの追加やディレクトリの新設は、ユーザーへの確認なしに行ってはならない。

---

## 1. 使用ライブラリ一覧

### コアフレームワーク

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Next.js | 16.3.1 | App Router。SSR は使わず CSR / Static Export が基本 |
| React | 19 | UI ライブラリ |
| TypeScript | latest (strict) | 全ファイルに適用 |

### UI・スタイリング

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Tailwind CSS | v4 | ユーティリティCSSフレームワーク |
| shadcn/ui | — | コンポーネント集。`src/components/ui/` に配置 |

### キャンバス・グラフィクス

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Konva.js | ^10.3.0 | 戦術ボードのキャンバスエンジン |
| react-konva | ^19.2.5 | Konva の React バインディング |

> **[!IMPORTANT]**
> 戦術ボードの実装は Konva を前提とする。
> Fabric.js / Canvas 2D API の直接使用は禁止。
> Konva のベストプラクティス（レイヤー分離・`listening={false}`・`perfectDrawEnabled={false}`）を厳守すること。

### 状態管理

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Zustand | v5 | グローバル状態管理。スライス分割パターンを採用 |

### ローカルデータベース

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Dexie.js | v4 | IndexedDB ラッパー。現在 DB スキーマ v20 |

> **[!WARNING]**
> サーバーサイド DB（Supabase 等）は使用していない。データはすべてブラウザの IndexedDB に保存される。
> DB スキーマを変更する場合は必ずバージョンを上げてマイグレーションを記述すること（`src/lib/db/schema.ts`）。

### 動画・画像エクスポート

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| WebCodecs API | ブラウザ標準 | フレーム単位のエンコード |
| mp4-muxer | — | MP4 書き出し |
| webm-muxer | — | WebM 書き出し |
| gif.js | — | GIF 書き出し |

### Chrome 拡張

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| WXT | — | Chrome 拡張のビルドフレームワーク。`extension/` ディレクトリで独立管理 |

### テスト

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Vitest | — | テストランナー |
| happy-dom | — | テスト用 DOM 環境 |
| Testing Library | — | コンポーネントテスト |

### Lint / フォーマット

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Biome | v2 | Lint + フォーマット（ESLint / Prettier の代替） |

> **[!IMPORTANT]**
> ESLint・Prettier は使用していない。Biome のみを使用すること。
> `biome-ignore` コメントの新規追加は原則禁止。既存のものは技術的負債として扱う。

---

## 2. ディレクトリ構成と各フォルダの責務

```
footics/
├── src/                            # Next.js アプリ本体（tsconfig.json の対象）
│   ├── app/                        # App Router: ページ・レイアウト・API Route
│   │   ├── layout.tsx              # ルートレイアウト
│   │   ├── page.tsx                # / : 試合一覧 + JSONインポート
│   │   ├── api/                    # API Routes（最小限）
│   │   ├── export/                 # エクスポート用ページ
│   │   ├── match/[matchId]/        # イベントタイムライン分析
│   │   ├── tactical/               # 戦術ボードエディタ
│   │   ├── teams/[teamId]/         # 選手マスターデータ
│   │   └── syntax-studio/          # ⚠️ 削除予定（デモUI）
│   │
│   ├── components/                 # UI コンポーネント
│   │   ├── ui/                     # shadcn/ui コンポーネント（自動生成。原則編集しない）
│   │   ├── layout/                 # ナビゲーション・共通レイアウト部品
│   │   └── features/               # 機能単位のコンポーネント群
│   │
│   ├── features/                   # ページ単位の大きな機能コンポーネント
│   │   ├── analysis/               # 試合分析ダッシュボード
│   │   ├── dashboard/              # 試合一覧ダッシュボード
│   │   ├── management/             # データ管理
│   │   ├── match/                  # 試合詳細
│   │   ├── memo-overlay/           # メモオーバーレイ
│   │   ├── national-dashboard/     # 代表戦ダッシュボード
│   │   ├── sidebar/                # サイドバー
│   │   ├── tactical-unified/       # 戦術ボード（メイン機能）
│   │   └── teams/                  # チーム・選手管理
│   │
│   ├── hooks/                      # カスタム React Hooks
│   │   ├── use-data-sync.ts
│   │   └── use-shortcut.ts
│   │
│   ├── lib/                        # ビジネスロジック・ユーティリティ（UI 非依存）
│   │   ├── agents/                 # エージェント評価ランタイム
│   │   ├── data/                   # フォーメーション・ピッチ座標・戦術ユーティリティ
│   │   ├── db/                     # Dexie.js スキーマ・クエリ関数
│   │   ├── features/               # 機能ロジック（memo-overlay 等）
│   │   └── tactical/               # 戦術ボード計算・座標変換・チェルシープリセット
│   │
│   ├── registry/                   # イベント定義レジストリ
│   │   └── events/
│   │
│   ├── services/                   # 外部サービス・ドメインサービス層
│   │   └── event-filter.ts
│   │
│   ├── stores/                     # Zustand ストア
│   │   ├── tactical-unified-store.ts   # 戦術ボードのメインストア（11スライス）
│   │   ├── ui-store.ts
│   │   └── pilotStore.ts           # ⚠️ 削除予定（デモ用）
│   │
│   └── types/                      # TypeScript 型定義
│       └── index.ts
│
├── extension/                      # Chrome 拡張（WXT）
│   │                               # 独立した tsconfig / package.json を持つ
│   └── ...                         # Next.js の tsconfig.json の exclude 対象
│
├── tasks/                          # エージェント用タスクファイル格納先
│
├── tests/                          # 統合テスト・エージェント評価ベンチマーク
│
└── docs/                           # 仕様・ドメイン知識リファレンス（辞書）
```

---
